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
import { fakeJwt, mockAdapter } from '../test/helpers'
import { capabilitiesForRole } from '../test/capabilities'
import type { StaffRole } from '../lib/permissions'

// The "Personal" screen: an organization admin sees their own staff and invites people, who choose
// their own password from an emailed link.

const NOW = '2026-01-01T00:00:00Z'
const person = (id: string, name: string, role: string, over: object = {}) => ({
  id, full_name: name, email: `${id}@x.co`, id_type: 'CC', id_number: `10${id}00`, phone: null, role_code: role,
  is_active: true, pending_activation: false, created_at: NOW, ...over,
})

const STAFF = [
  person('s1', 'Carla Operadora', 'eca_operator'),
  person('s2', 'Pedro Pendiente', 'eca_warehouse', { pending_activation: true, is_active: true }),
  person('s3', 'Dora Desactivada', 'eca_operator', { is_active: false }),
]

const ROLES = [
  { code: 'eca_admin', label: 'ECA · Administrativo', user_type_code: 'eca' },
  { code: 'eca_operator', label: 'ECA · Operador de báscula', user_type_code: 'eca' },
  { code: 'eca_warehouse', label: 'ECA · Encargado de bodega', user_type_code: 'eca' },
  { code: 'association_admin', label: 'Asociación · Administrativo', user_type_code: 'association' },
]

interface Recorded { method: string; url: string; params: Record<string, unknown>; body: unknown }
let requests: Recorded[]
let inviteFailure: { status: number; code: string } | null

function signInAs(role: StaffRole, userType: string) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const method = String(c.method).toUpperCase()
    requests.push({ method, url, params: (c.params ?? {}) as Record<string, unknown>, body: c.data ? JSON.parse(c.data) : undefined })
    if (url === '/auth/me') {
      return {
        data: {
          id: 'me', email: 'me@x.co', full_name: 'Admin', phone: null, id_type: 'CC', id_number: '9',
          user_type_code: userType, role_code: role, capabilities: capabilitiesForRole(role), is_active: true,
          email_verified_at: NOW, created_at: NOW, pending_activation: false,
        },
      }
    }
    if (url === '/users' && method === 'GET') return { data: { total: STAFF.length, limit: 25, offset: 0, items: STAFF } }
    if (url === '/users/invitations') {
      if (inviteFailure) return { status: inviteFailure.status, data: { detail: 'x', code: inviteFailure.code } }
      const body = JSON.parse(c.data)
      return { status: 201, data: person('new', body.full_name, body.role_code, { email: body.email, pending_activation: true }) }
    }
    if (/^\/users\/[^/]+\/invitation\/resend$/.test(url)) return { data: person('s2', 'Pedro Pendiente', 'eca_warehouse', { pending_activation: true }) }
    if (url === '/catalogs/roles') return { data: ROLES }
    if (url === '/catalogs/document-types') return { data: [{ code: 'CC', label: 'Cédula de Ciudadanía' }] }
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

describe('staff screen', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    requests = []
    inviteFailure = null
  })

  it('lists the staff of the admin\'s own kind of organization, with role and status', async () => {
    signInAs('eca_admin', 'eca')
    renderAt('/personal')
    expect(await screen.findByText('Carla Operadora')).toBeInTheDocument()
    expect(to('GET', '/users')[0].params).toMatchObject({ user_type_code: 'eca' })
    const row = screen.getByRole('row', { name: /Pedro Pendiente/ })
    expect(within(row).getByText(t.personal.status.pending_activation)).toBeInTheDocument()
    expect(within(row).getByText('ECA · Encargado de bodega')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Dora Desactivada/ })).getByText(t.personal.status.inactive)).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Carla Operadora/ })).getByText(t.personal.status.active)).toBeInTheDocument()
  })

  it('an Association admin asks for Association staff', async () => {
    signInAs('association_admin', 'association')
    renderAt('/personal')
    await screen.findByText('Carla Operadora')
    expect(to('GET', '/users')[0].params).toMatchObject({ user_type_code: 'association' })
  })

  it('offers "resend invitation" only to people who have not activated yet', async () => {
    signInAs('eca_admin', 'eca')
    renderAt('/personal')
    await screen.findByText('Carla Operadora')
    expect(screen.getAllByRole('button', { name: t.personal.resend.button })).toHaveLength(1)
    await userEvent.click(within(screen.getByRole('row', { name: /Pedro Pendiente/ })).getByRole('button', { name: t.personal.resend.button }))
    await waitFor(() => expect(to('POST', '/users/s2/invitation/resend')).toHaveLength(1))
    expect(await screen.findByText('Enviamos una nueva invitación a s2@x.co')).toBeInTheDocument()
  })

  it('invites a person: sends the role and data, and only offers roles of the own organization', async () => {
    signInAs('eca_admin', 'eca')
    renderAt('/personal')
    await screen.findByText('Carla Operadora')
    await userEvent.click(screen.getByRole('button', { name: t.personal.inviteButton }))

    await userEvent.type(await screen.findByLabelText(new RegExp(t.personal.invite.fields.fullName)), 'Nuevo Nombre')
    await userEvent.type(screen.getByLabelText(new RegExp(t.personal.invite.fields.email)), 'nuevo@eca.co')
    await userEvent.click(screen.getByRole('combobox', { name: new RegExp(t.personal.invite.fields.documentType) }))
    await userEvent.click(await screen.findByRole('option', { name: 'Cédula de Ciudadanía' }))
    await userEvent.type(screen.getByLabelText(new RegExp(t.personal.invite.fields.documentNumber)), '1020304050')
    await userEvent.click(screen.getByRole('combobox', { name: new RegExp(t.personal.invite.fields.role) }))
    expect(screen.queryByRole('option', { name: 'Asociación · Administrativo' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('option', { name: 'ECA · Operador de báscula' }))
    await userEvent.click(screen.getByRole('button', { name: t.personal.invite.submitLabel }))

    await waitFor(() => expect(to('POST', '/users/invitations')).toHaveLength(1))
    expect(to('POST', '/users/invitations')[0].body).toEqual({
      full_name: 'Nuevo Nombre', email: 'nuevo@eca.co', id_type: 'CC', id_number: '1020304050', phone: null,
      role_code: 'eca_operator',
    })
    expect(await screen.findByText(/Invitación enviada a nuevo@eca.co/)).toBeInTheDocument()
    // The list reloads so the new person shows up.
    await waitFor(() => expect(to('GET', '/users').length).toBeGreaterThanOrEqual(2))
  })

  it('shows the server\'s reason in Spanish when the invitation is refused', async () => {
    signInAs('eca_admin', 'eca')
    inviteFailure = { status: 409, code: 'account_already_exists' }
    renderAt('/personal')
    await screen.findByText('Carla Operadora')
    await userEvent.click(screen.getByRole('button', { name: t.personal.inviteButton }))
    await userEvent.type(await screen.findByLabelText(new RegExp(t.personal.invite.fields.fullName)), 'Repetido Uno')
    await userEvent.type(screen.getByLabelText(new RegExp(t.personal.invite.fields.email)), 'r@eca.co')
    await userEvent.click(screen.getByRole('combobox', { name: new RegExp(t.personal.invite.fields.documentType) }))
    await userEvent.click(await screen.findByRole('option', { name: 'Cédula de Ciudadanía' }))
    await userEvent.type(screen.getByLabelText(new RegExp(t.personal.invite.fields.documentNumber)), '1020304050')
    await userEvent.click(screen.getByRole('combobox', { name: new RegExp(t.personal.invite.fields.role) }))
    await userEvent.click(await screen.findByRole('option', { name: 'ECA · Operador de báscula' }))
    await userEvent.click(screen.getByRole('button', { name: t.personal.invite.submitLabel }))
    expect(await screen.findByText('Ya existe una cuenta con esos datos.')).toBeInTheDocument()
  })

  it('is not reachable for roles the server did not give staff.view', async () => {
    signInAs('eca_operator', 'eca')
    renderAt('/personal')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(to('GET', '/users')).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.personal })).not.toBeInTheDocument()
  })
})
