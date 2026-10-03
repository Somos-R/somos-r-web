import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession, setTokens } from '../lib/session'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'
import { fakeJwt, mockAdapter } from '../test/helpers'
import { capabilitiesForRole } from '../test/capabilities'
import type { StaffRole } from '../lib/permissions'

// Links between an ECA and an Association: the ECA asks, the Association decides, either can end it.

const NOW = '2026-01-01T00:00:00Z'
const ref = (id: string, name: string, city: string | null = 'Bogotá') => ({ id, legal_name: name, city })
const ECA = ref('eca-1', 'ECA Norte')

type Status = 'requested' | 'active' | 'rejected' | 'removed'
interface LinkRow { id: string; status: Status; eca: ReturnType<typeof ref>; association: ReturnType<typeof ref>; rejection_reason: string | null; decided_at: string | null; created_at: string; updated_at: string }
const link = (id: string, status: Status, eca: ReturnType<typeof ref>, association: ReturnType<typeof ref>, over: Partial<LinkRow> = {}): LinkRow => ({
  id, status, eca, association, rejection_reason: null, decided_at: status === 'requested' ? null : NOW, created_at: NOW, updated_at: NOW, ...over,
})

const ASSOCIATIONS = [
  ref('a1', 'Asociación Uno'), ref('a2', 'Asociación Dos', 'Cali'), ref('a3', 'Asociación Tres', null),
  ref('a4', 'Asociación Cuatro'), ref('a5', 'Asociación Cinco'), ref('a6', 'Asociación Seis'),
]
const MY_ASSOCIATION = ref('a2', 'Asociación Dos', 'Cali')

let ECA_LINKS: LinkRow[]
let ASSOCIATION_LINKS: LinkRow[]
let failure: { url: RegExp; status: number; code: string } | null

interface Recorded { method: string; url: string; params: Record<string, unknown>; body: unknown }
let requests: Recorded[]

function serve(role: StaffRole) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  const userType = role.startsWith('eca') ? 'eca' : 'association'
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const method = String(c.method).toUpperCase()
    const params = (c.params ?? {}) as Record<string, unknown>
    requests.push({ method, url, params, body: c.data ? JSON.parse(c.data) : undefined })
    const rows = userType === 'eca' ? ECA_LINKS : ASSOCIATION_LINKS

    if (url === '/auth/me') {
      return { data: { id: 'me', email: 'me@x.co', full_name: 'Admin', phone: null, id_type: 'CC', id_number: '9', user_type_code: userType, role_code: role, capabilities: capabilitiesForRole(role), is_active: true, email_verified_at: NOW, created_at: NOW, pending_activation: false } }
    }
    if (failure && failure.url.test(url) && method === 'POST') return { status: failure.status, data: { detail: 'x', code: failure.code } }

    if (url === '/directory/associations') {
      const q = String(params.q ?? '').toLowerCase()
      const found = ASSOCIATIONS.filter((a) => !q || a.legal_name.toLowerCase().includes(q))
      const items = found.map((a) => ({ ...a, link_status: ECA_LINKS.find((l) => l.association.id === a.id)?.status ?? null }))
      const limit = Number(params.limit ?? 20)
      const offset = Number(params.offset ?? 0)
      return { data: { total: items.length, limit, offset, items: items.slice(offset, offset + limit) } }
    }
    if (url === '/links' && method === 'GET') {
      const filtered = rows.filter((l) => !params.status || l.status === params.status)
      const limit = Number(params.limit ?? 50)
      const offset = Number(params.offset ?? 0)
      return { data: { total: filtered.length, limit, offset, items: filtered.slice(offset, offset + limit) } }
    }
    if (url === '/links' && method === 'POST') {
      const body = JSON.parse(c.data)
      const existing = ECA_LINKS.find((l) => l.association.id === body.association_id)
      if (existing) existing.status = 'requested'
      else ECA_LINKS.push(link(`new-${body.association_id}`, 'requested', ECA, ASSOCIATIONS.find((a) => a.id === body.association_id)!))
      return { status: 201, data: {} }
    }
    const action = url.match(/^\/links\/([^/]+)\/(accept|reject|remove)$/)
    if (action) {
      const row = rows.find((l) => l.id === action[1])!
      row.status = action[2] === 'accept' ? 'active' : action[2] === 'reject' ? 'rejected' : 'removed'
      if (action[2] === 'reject') row.rejection_reason = c.data ? JSON.parse(c.data).reason ?? null : null
      return { data: row }
    }
    return { data: { total: 0, items: [] } }
  })
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

const to = (method: string, url: string) => requests.filter((r) => r.method === method && r.url === url)

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
  failure = null
  ECA_LINKS = [
    link('l1', 'requested', ECA, ASSOCIATIONS[1]),
    link('l2', 'active', ECA, ASSOCIATIONS[2]),
    link('l3', 'rejected', ECA, ASSOCIATIONS[3], { rejection_reason: 'Sin cobertura en tu zona' }),
    link('l4', 'removed', ECA, ASSOCIATIONS[4]),
  ]
  ASSOCIATION_LINKS = [
    link('k1', 'requested', ref('e1', 'ECA Norte'), MY_ASSOCIATION),
    link('k2', 'requested', ref('e2', 'ECA Sur', 'Cali'), MY_ASSOCIATION),
    link('k3', 'active', ref('e3', 'ECA Centro'), MY_ASSOCIATION),
    link('k4', 'rejected', ref('e4', 'ECA Este'), MY_ASSOCIATION, { rejection_reason: 'Fuera de zona' }),
  ]
})

describe('an ECA admin', () => {
  it('sees their own links with the state of each and the reason of a rejection', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    expect(await screen.findByRole('heading', { level: 1, name: t.vinculaciones.title })).toBeInTheDocument()
    const links = await screen.findByRole('region', { name: t.vinculaciones.links.title })
    const rows = within(links)
    // The region renders before its rows arrive: wait for the first one, the rest come with it.
    expect(await rows.findByRole('row', { name: /Asociación Dos/ })).toHaveTextContent(t.vinculaciones.status.requested)
    expect(rows.getByRole('row', { name: /Asociación Tres/ })).toHaveTextContent(t.vinculaciones.status.active)
    expect(rows.getByRole('row', { name: /Asociación Cuatro/ })).toHaveTextContent('Sin cobertura en tu zona')
    expect(rows.getByRole('row', { name: /Asociación Cinco/ })).toHaveTextContent(t.vinculaciones.status.removed)
    // Cancel is for the pending one, remove for the active one; the others have nothing to do here.
    expect(rows.getAllByRole('button', { name: t.vinculaciones.actions.cancel })).toHaveLength(1)
    expect(rows.getAllByRole('button', { name: t.vinculaciones.actions.remove })).toHaveLength(1)
  })

  it('can filter their links by state', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    await screen.findAllByText('Asociación Tres')
    await userEvent.click(screen.getByRole('combobox', { name: t.vinculaciones.filter.label }))
    await userEvent.click(await screen.findByRole('option', { name: t.vinculaciones.status.active }))
    await waitFor(() => expect(to('GET', '/links').at(-1)?.params).toMatchObject({ status: 'active' }))
  })

  it('finds associations in the directory with the state of each link, offering to ask only where it makes sense', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    const directory = within(await screen.findByRole('region', { name: t.vinculaciones.directory.title }))
    await directory.findByText('Asociación Uno')
    // No link yet, or one that was rejected/removed: can be asked (again). Pending or active: nothing to ask.
    expect(within(directoryRowIn(directory, 'Asociación Uno')).getByRole('button', { name: t.vinculaciones.actions.request })).toBeInTheDocument()
    expect(within(directoryRowIn(directory, 'Asociación Cuatro')).getByRole('button', { name: t.vinculaciones.actions.requestAgain })).toBeInTheDocument()
    expect(within(directoryRowIn(directory, 'Asociación Cinco')).getByRole('button', { name: t.vinculaciones.actions.requestAgain })).toBeInTheDocument()
    expect(within(directoryRowIn(directory, 'Asociación Dos')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(directoryRowIn(directory, 'Asociación Tres')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('searches the directory on the server, once per pause, and not for text it would ignore', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    await screen.findByText('Asociación Seis')
    await userEvent.type(screen.getByPlaceholderText(t.vinculaciones.directory.searchPlaceholder), 'S')
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(to('GET', '/directory/associations').every((r) => r.params.q === undefined)).toBe(true)

    await userEvent.type(screen.getByPlaceholderText(t.vinculaciones.directory.searchPlaceholder), 'eis')
    await waitFor(() => expect(to('GET', '/directory/associations').at(-1)?.params).toMatchObject({ q: 'Seis', offset: 0 }))
    const directory = within(screen.getByRole('region', { name: t.vinculaciones.directory.title }))
    expect(await directory.findByText('Asociación Seis')).toBeInTheDocument()
    expect(directory.queryByText('Asociación Uno')).not.toBeInTheDocument()
  })

  it('asks an association to link: the request goes out and both lists show the new state', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    const directory = within(await screen.findByRole('region', { name: t.vinculaciones.directory.title }))
    await directory.findByText('Asociación Uno')
    await userEvent.click(within(directoryRowIn(directory, 'Asociación Uno')).getByRole('button', { name: t.vinculaciones.actions.request }))

    await waitFor(() => expect(to('POST', '/links')).toHaveLength(1))
    expect(to('POST', '/links')[0].body).toEqual({ association_id: 'a1' })
    expect(await screen.findByText('Solicitud enviada a Asociación Uno')).toBeInTheDocument()
    // The directory now shows it as pending (no button), and it appears among "my links".
    await waitFor(() => expect(within(directoryRowIn(within(screen.getByRole('region', { name: t.vinculaciones.directory.title })), 'Asociación Uno')).queryByRole('button')).not.toBeInTheDocument())
    expect(within(screen.getByRole('region', { name: t.vinculaciones.links.title })).getByRole('row', { name: /Asociación Uno/ })).toBeInTheDocument()
  })

  it('cancels a pending request only after confirming', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    const links = within(await screen.findByRole('region', { name: t.vinculaciones.links.title }))
    await userEvent.click(within(await links.findByRole('row', { name: /Asociación Dos/ })).getByRole('button', { name: t.vinculaciones.actions.cancel }))
    expect(to('POST', '/links/l1/remove')).toHaveLength(0)
    await userEvent.click(await screen.findByRole('button', { name: t.vinculaciones.confirm.cancelButton }))
    await waitFor(() => expect(to('POST', '/links/l1/remove')).toHaveLength(1))
    expect(await screen.findByText(t.vinculaciones.messages.cancelled)).toBeInTheDocument()
  })

  it('ends an active link after confirming, and can keep it instead', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    const links = within(await screen.findByRole('region', { name: t.vinculaciones.links.title }))
    const removeButton = within(await links.findByRole('row', { name: /Asociación Tres/ })).getByRole('button', { name: t.vinculaciones.actions.remove })

    await userEvent.click(removeButton)
    await userEvent.click(await screen.findByRole('button', { name: t.vinculaciones.confirm.keep }))
    expect(to('POST', '/links/l2/remove')).toHaveLength(0)

    await userEvent.click(removeButton)
    await userEvent.click(await screen.findByRole('button', { name: t.vinculaciones.confirm.removeButton }))
    await waitFor(() => expect(to('POST', '/links/l2/remove')).toHaveLength(1))
    expect(await screen.findByText(t.vinculaciones.messages.removed)).toBeInTheDocument()
  })

  it('shows the translated reason, and reloads, when the server refuses', async () => {
    serve('eca_admin')
    failure = { url: /^\/links$/, status: 409, code: 'link_already_requested' }
    renderAt('/vinculaciones')
    const directory = within(await screen.findByRole('region', { name: t.vinculaciones.directory.title }))
    await directory.findByText('Asociación Uno')
    const before = to('GET', '/links').length
    await userEvent.click(within(directoryRowIn(directory, 'Asociación Uno')).getByRole('button', { name: t.vinculaciones.actions.request }))
    expect(await screen.findByText(t.apiErrors.link_already_requested)).toBeInTheDocument()
    await waitFor(() => expect(to('GET', '/links').length).toBeGreaterThan(before))
  })

  it('has no way to decide requests: that is the association\'s side', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    await screen.findAllByText('Asociación Tres')
    expect(screen.queryByRole('button', { name: t.vinculaciones.actions.accept })).not.toBeInTheDocument()
  })
})

// The directory row is found inside its region so the same name in "my links" doesn't get in the way.
function directoryRowIn(scope: ReturnType<typeof within>, name: string) {
  return scope.getByRole('row', { name: new RegExp(name) })
}

describe('an Association admin', () => {
  it('sees the pending requests first, and no directory', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    expect(await screen.findByText('ECA Norte')).toBeInTheDocument()
    expect(to('GET', '/links')[0].params).toMatchObject({ status: 'requested' })
    expect(screen.getByText('ECA Sur')).toBeInTheDocument()
    expect(screen.queryByText('ECA Centro')).not.toBeInTheDocument() // active: another filter
    expect(to('GET', '/directory/associations')).toHaveLength(0)
    expect(screen.queryByPlaceholderText(t.vinculaciones.directory.searchPlaceholder)).not.toBeInTheDocument()
  })

  it('accepts a request', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    await userEvent.click(within(await screen.findByRole('row', { name: /ECA Norte/ })).getByRole('button', { name: t.vinculaciones.actions.accept }))
    await waitFor(() => expect(to('POST', '/links/k1/accept')).toHaveLength(1))
    expect(await screen.findByText(t.vinculaciones.messages.accepted)).toBeInTheDocument()
    // It is no longer pending, so it leaves this list.
    await waitFor(() => expect(screen.queryByText('ECA Norte')).not.toBeInTheDocument())
  })

  it('rejects a request with a reason the ECA will see', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    await userEvent.click(within(await screen.findByRole('row', { name: /ECA Sur/ })).getByRole('button', { name: t.vinculaciones.actions.reject }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(t.vinculaciones.reject.reasonLabel), 'Fuera de nuestra zona')
    await userEvent.click(within(dialog).getByRole('button', { name: t.vinculaciones.reject.confirmButton }))
    await waitFor(() => expect(to('POST', '/links/k2/reject')).toHaveLength(1))
    expect(to('POST', '/links/k2/reject')[0].body).toEqual({ reason: 'Fuera de nuestra zona' })
    expect(await screen.findByText(t.vinculaciones.messages.rejected)).toBeInTheDocument()
  })

  it('may reject without a reason', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    await userEvent.click(within(await screen.findByRole('row', { name: /ECA Sur/ })).getByRole('button', { name: t.vinculaciones.actions.reject }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.vinculaciones.reject.confirmButton }))
    await waitFor(() => expect(to('POST', '/links/k2/reject')).toHaveLength(1))
    expect(to('POST', '/links/k2/reject')[0].body).toEqual({})
  })

  it('ends an active link from the active filter, after confirming', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    await screen.findByText('ECA Norte')
    await userEvent.click(screen.getByRole('combobox', { name: t.vinculaciones.filter.label }))
    await userEvent.click(await screen.findByRole('option', { name: t.vinculaciones.status.active }))
    const row = within(await screen.findByRole('row', { name: /ECA Centro/ }))
    expect(row.queryByRole('button', { name: t.vinculaciones.actions.accept })).not.toBeInTheDocument()
    await userEvent.click(row.getByRole('button', { name: t.vinculaciones.actions.remove }))
    await userEvent.click(await screen.findByRole('button', { name: t.vinculaciones.confirm.removeButton }))
    await waitFor(() => expect(to('POST', '/links/k3/remove')).toHaveLength(1))
    expect(await screen.findByText(t.vinculaciones.messages.removed)).toBeInTheDocument()
  })

  it('shows the translated reason when someone already answered the request', async () => {
    serve('association_admin')
    failure = { url: /accept$/, status: 409, code: 'link_not_pending' }
    renderAt('/vinculaciones')
    await userEvent.click(within(await screen.findByRole('row', { name: /ECA Norte/ })).getByRole('button', { name: t.vinculaciones.actions.accept }))
    expect(await screen.findByText(t.apiErrors.link_not_pending)).toBeInTheDocument()
  })

  it('shows the reason of a rejection in the rejected filter', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    await screen.findByText('ECA Norte')
    await userEvent.click(screen.getByRole('combobox', { name: t.vinculaciones.filter.label }))
    await userEvent.click(await screen.findByRole('option', { name: t.vinculaciones.status.rejected }))
    expect(await screen.findByText(/Fuera de zona/)).toBeInTheDocument()
  })
})

describe('access', () => {
  it('is not reachable for roles without links.view', async () => {
    serve('eca_operator')
    renderAt('/vinculaciones')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(to('GET', '/links')).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.vinculaciones })).not.toBeInTheDocument()
  })

  it('appears in the menu for both kinds of admin', async () => {
    serve('eca_admin')
    const eca = renderAt('/')
    expect(await screen.findByRole('link', { name: t.nav.vinculaciones })).toBeInTheDocument()
    eca.unmount()
    clearSession()
    queryClient.clear()
    serve('association_admin')
    renderAt('/')
    expect(await screen.findByRole('link', { name: t.nav.vinculaciones })).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('ECA page', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    await screen.findByText('Asociación Seis')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('Association page', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    await screen.findByText('ECA Norte')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('reject dialog', async () => {
    serve('association_admin')
    renderAt('/vinculaciones')
    await userEvent.click(within(await screen.findByRole('row', { name: /ECA Sur/ })).getByRole('button', { name: t.vinculaciones.actions.reject }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })

  it('confirmation dialog', async () => {
    serve('eca_admin')
    renderAt('/vinculaciones')
    const links = within(await screen.findByRole('region', { name: t.vinculaciones.links.title }))
    await userEvent.click(within(await links.findByRole('row', { name: /Asociación Tres/ })).getByRole('button', { name: t.vinculaciones.actions.remove }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })
})
