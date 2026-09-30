import { beforeEach, describe, expect, it } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'
import { mockAdapter } from '../test/helpers'
import { renderAt, serveApi } from '../test/fakeApi'

// An ECA receives material from whoever brings it: a registered recycler of any association (or none),
// or a person who is not registered. Who they are is found by document.

interface Recorded { method: string; url: string; params: Record<string, unknown>; body: unknown }
let requests: Recorded[]
let lookupReply: { status?: number; data: unknown }
let createFailure: { status: number; code: string } | null

const recycler = (over: object = {}) => ({
  id: 'r1', full_name: 'Rita Reciclaje', id_type: 'CC', id_number: '1001', is_active: true, verification_status: 'verified',
  association: { id: 'a1', legal_name: 'Asociación Uno', city: 'Bogotá' }, affiliation: 'linked', ...over,
})

/** The shared fake API, plus a record of every request and a controllable lookup and create. */
function serve() {
  serveApi('eca_admin')
  const inner = apiClient.defaults.adapter as AxiosAdapter
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = String(config.url)
    const method = String(config.method).toUpperCase()
    requests.push({ method, url, params: (config.params ?? {}) as Record<string, unknown>, body: config.data ? JSON.parse(config.data) : undefined })
    if (url === '/recyclers/lookup') return mockAdapter(() => lookupReply)(config)
    if (url === '/weighings' && method === 'POST') {
      return mockAdapter(() => (createFailure ? { status: createFailure.status, data: { detail: 'x', code: createFailure.code } } : { status: 201, data: {} }))(config)
    }
    return inner(config)
  }
}

const sent = (method: string, url: string) => requests.filter((r) => r.method === method && r.url === url)

const openDrawer = async () => {
  await screen.findByText('Rita Pendiente')
  await userEvent.click(screen.getByRole('button', { name: t.pesajes.newWeighing }))
  return within(await screen.findByRole('presentation'))
}

const search = async (drawer: ReturnType<typeof within>, document: string) => {
  await userEvent.type(drawer.getByLabelText(t.pesajes.drawer.person.documentNumber), document)
  await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.person.searchButton }))
}

const fillWeighing = async (drawer: ReturnType<typeof within>) => {
  await userEvent.click(drawer.getByLabelText(/Material/))
  await userEvent.click(await screen.findByRole('option', { name: 'Plástico' }))
  await userEvent.click(drawer.getByLabelText(/Bodega/))
  await userEvent.click(await screen.findByRole('option', { name: 'Bodega Norte' }))
  await userEvent.type(drawer.getByLabelText(/Kilogramos/), '12')
  await waitFor(() => expect(drawer.getByLabelText(/Precio/)).toHaveValue(300))
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
  lookupReply = { data: recycler() }
  createFailure = null
})

describe('weighings table', () => {
  it('shows a registered recycler and an unregistered seller, each with how they relate to the ECA', async () => {
    serve()
    renderAt('/pesajes')
    const registered = await screen.findByRole('row', { name: /Rita Pendiente/ })
    expect(within(registered).getByText(t.pesajes.affiliation.linked)).toBeInTheDocument()

    const seller = screen.getByRole('row', { name: /Wilson Vendedor/ })
    expect(within(seller).getByText(`CC 55501 · ${t.pesajes.table.unregistered}`)).toBeInTheDocument()
    expect(within(seller).getByText(t.pesajes.affiliation.independent)).toBeInTheDocument()
  })
})

describe('who delivers: the document lookup', () => {
  it('finds a registered recycler and shows their association and how they relate to this ECA', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '1001')

    const person = await drawer.findByRole('region', { name: t.pesajes.drawer.who })
    expect(within(person).getByText('Rita Reciclaje')).toBeInTheDocument()
    expect(within(person).getByText(/Asociación Uno/)).toBeInTheDocument()
    expect(within(person).getByText(t.pesajes.affiliation.linked)).toBeInTheDocument()
    expect(within(person).getByText(t.pesajes.drawer.person.affiliationNote.linked)).toBeInTheDocument()
    // The document type the operator chose travels with the number.
    expect(sent('GET', '/recyclers/lookup')[0].params).toEqual({ document: '1001', id_type: 'CC' })
  })

  it('says when the recycler belongs to an association that is not linked, or to none', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    lookupReply = { data: recycler({ affiliation: 'unlinked_association' }) }
    await search(drawer, '1001')
    expect(await drawer.findByText(t.pesajes.drawer.person.affiliationNote.unlinked_association)).toBeInTheDocument()

    await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.person.change }))
    lookupReply = { data: recycler({ association: null, affiliation: 'independent' }) }
    await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.person.searchButton }))
    expect(await drawer.findByText(t.pesajes.drawer.person.affiliationNote.independent)).toBeInTheDocument()
    expect(drawer.getByText(new RegExp(t.pesajes.drawer.person.noAssociation))).toBeInTheDocument()
  })

  it('does not ask the server for a document that is too short', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '12')
    expect(await drawer.findByText(t.pesajes.drawer.person.documentLength)).toBeInTheDocument()
    expect(sent('GET', '/recyclers/lookup')).toHaveLength(0)
  })

  it('refuses a deactivated account instead of letting the form fail later', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    lookupReply = { data: recycler({ is_active: false }) }
    await search(drawer, '1001')
    expect(await drawer.findByText(t.pesajes.drawer.person.inactive)).toBeInTheDocument()
    expect(drawer.queryByRole('region', { name: t.pesajes.drawer.who })).not.toBeInTheDocument()
  })

  it('lets the operator go back and look up someone else', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '1001')
    await userEvent.click(await drawer.findByRole('button', { name: t.pesajes.drawer.person.change }))
    expect(drawer.getByLabelText(t.pesajes.drawer.person.documentNumber)).toBeInTheDocument()
    expect(drawer.queryByText('Rita Reciclaje')).not.toBeInTheDocument()
  })

  it('shows the reason when the search fails for another reason', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    lookupReply = { status: 403, data: { detail: 'x', code: 'no_organization' } }
    await search(drawer, '1001')
    expect(await drawer.findByText(t.apiErrors.no_organization)).toBeInTheDocument()
  })
})

describe('registering the weighing', () => {
  it('sends the registered recycler', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '1001')
    await drawer.findByRole('region', { name: t.pesajes.drawer.who })
    await fillWeighing(drawer)
    await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.submit }))

    await waitFor(() => expect(sent('POST', '/weighings')).toHaveLength(1))
    expect(sent('POST', '/weighings')[0].body).toEqual({
      recycler_id: 'r1', material_code: 'plastic', warehouse_id: 'b1', kg: 12, price_per_kg: 300,
    })
    expect(await screen.findByText(t.pesajes.drawer.success)).toBeInTheDocument()
  })

  it('offers to register an unregistered person as a seller, with their own data', async () => {
    serve()
    lookupReply = { status: 404, data: { detail: 'x', code: 'recycler_not_found' } }
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '9999')

    expect(await drawer.findByText(t.pesajes.drawer.person.notFound)).toBeInTheDocument()
    await userEvent.type(drawer.getByLabelText(t.pesajes.drawer.person.sellerName), 'Sandra Sin Registro')
    await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.person.registerAsSeller }))
    const person = await drawer.findByRole('region', { name: t.pesajes.drawer.who })
    expect(within(person).getByText('Sandra Sin Registro')).toBeInTheDocument()
    expect(within(person).getByText(t.pesajes.drawer.person.sellerTitle)).toBeInTheDocument()

    await fillWeighing(drawer)
    await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.submit }))
    await waitFor(() => expect(sent('POST', '/weighings')).toHaveLength(1))
    // Exactly one of the two: the seller's data, and no recycler_id.
    expect(sent('POST', '/weighings')[0].body).toEqual({
      seller: { full_name: 'Sandra Sin Registro', id_type: 'CC', id_number: '9999' },
      material_code: 'plastic', warehouse_id: 'b1', kg: 12, price_per_kg: 300,
    })
  })

  it('needs a name to register an unregistered seller', async () => {
    serve()
    lookupReply = { status: 404, data: { detail: 'x', code: 'recycler_not_found' } }
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '9999')
    await userEvent.click(await drawer.findByRole('button', { name: t.pesajes.drawer.person.registerAsSeller }))
    expect(await drawer.findByText(t.pesajes.drawer.validation.sellerName)).toBeInTheDocument()
  })

  it('does not send anything until someone is identified', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.submit }))
    expect(await drawer.findByText(t.pesajes.drawer.validation.person)).toBeInTheDocument()
    expect(sent('POST', '/weighings')).toHaveLength(0)
  })

  it('shows the translated reason when the server refuses (for example a deactivated recycler)', async () => {
    serve()
    createFailure = { status: 403, code: 'recycler_inactive' }
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '1001')
    await drawer.findByRole('region', { name: t.pesajes.drawer.who })
    await fillWeighing(drawer)
    await userEvent.click(drawer.getByRole('button', { name: t.pesajes.drawer.submit }))
    expect(await screen.findByText(t.apiErrors.recycler_inactive)).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('drawer with the lookup form', async () => {
    serve()
    renderAt('/pesajes')
    await openDrawer()
    await expectNoA11yViolations()
  })

  it('drawer with a found recycler', async () => {
    serve()
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '1001')
    await drawer.findByRole('region', { name: t.pesajes.drawer.who })
    await expectNoA11yViolations()
  })

  it('drawer offering to register a seller', async () => {
    serve()
    lookupReply = { status: 404, data: { detail: 'x', code: 'recycler_not_found' } }
    renderAt('/pesajes')
    const drawer = await openDrawer()
    await search(drawer, '9999')
    await drawer.findByText(t.pesajes.drawer.person.notFound)
    await expectNoA11yViolations()
  })

  it('the weighings list with an unregistered seller', async () => {
    serve()
    renderAt('/pesajes')
    await screen.findByText('Wilson Vendedor')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })
})
