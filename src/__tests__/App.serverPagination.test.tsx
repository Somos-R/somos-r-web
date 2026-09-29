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

// Lists are paginated and filtered BY THE SERVER. The fake API below really filters and slices by
// the request's params, so these tests show what each screen asks for, and that it never assumes
// it holds every row.

const MATERIALS = [
  { code: 'plastic', label: 'Plástico', unit: 'kg' },
  { code: 'paper', label: 'Papel', unit: 'kg' },
]
const WAREHOUSES = [
  { id: 'b1', name: 'Bodega Norte', address: null },
  { id: 'b2', name: 'Bodega Sur', address: null },
]
const WEIGHING_STATUSES = ['pending_validation', 'validated', 'rejected', 'paid'] as const
const RECYCLER_STATUSES = ['pending', 'verified', 'rejected'] as const

const makeWeighings = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `w${i}`, recycler_id: 'r1', recycler: { id: 'r1', full_name: `Reciclador ${i}`, id_number: '1' },
    material_code: MATERIALS[i % 2].code, material: MATERIALS[i % 2], warehouse_id: 'b1', warehouse: WAREHOUSES[0],
    kg: 10, price_per_kg: 500, status: WEIGHING_STATUSES[i % 4], rejection_reason: null, validated_by: null,
    validated_at: null, occurred_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', total_value: 5000,
  }))

const makeInventory = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `i${i}`, material_code: MATERIALS[i % 2].code, warehouse_id: WAREHOUSES[i % 2].id, stock_kg: 100 + i,
    stock_min_kg: 20, price_per_kg: 300 + i, updated_at: '2026-01-01T00:00:00Z',
    status: (['available', 'low_stock', 'out_of_stock'] as const)[i % 3], total_value: 1000,
    material: MATERIALS[i % 2], warehouse: WAREHOUSES[i % 2],
  }))

const makeTransactions = (type: 'purchase' | 'sale', n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${type}${i}`, type, status: (['pending', 'paid'] as const)[i % 2], material_code: 'plastic', warehouse_id: 'b1',
    kg: 8, price_per_kg: 250, total_value: 2000, recycler_id: null, recycler: null, weighing_id: null,
    buyer_name: type === 'sale' ? `Comprador ${i}` : null, buyer_nit: null, buyer_email: null,
    occurred_at: '2026-01-03T00:00:00Z', created_at: '2026-01-03T00:00:00Z', material: MATERIALS[0], warehouse: WAREHOUSES[0],
  }))

const makeRecyclers = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `u${i}`, full_name: `Persona ${i}`, email: `p${i}@x.co`, id_type: 'CC', id_number: String(1000 + i), phone: null,
    verification_status: RECYCLER_STATUSES[i % 3], rejection_reason: null, verified_at: null, profile_picture: null,
    id_picture: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  }))

type Params = Record<string, string | number | undefined>
interface Recorded { url: string; params: Params }

let requests: Recorded[]
let data: {
  weighings: ReturnType<typeof makeWeighings>
  inventory: ReturnType<typeof makeInventory>
  purchases: ReturnType<typeof makeTransactions>
  sales: ReturnType<typeof makeTransactions>
  recyclers: ReturnType<typeof makeRecyclers>
}

/** Applies the request's filters and slices the page, like the real API does. */
function paged<T>(all: T[], params: Params, matches: (item: T) => boolean) {
  const rows = all.filter(matches)
  const limit = Number(params.limit ?? 20)
  const offset = Number(params.offset ?? 0)
  return { total: rows.length, limit, offset, items: rows.slice(offset, offset + limit) }
}

const requestsTo = (url: string) => requests.filter((r) => r.url === url)
const lastTo = (url: string) => requestsTo(url).at(-1)

function serveApi() {
  requests = []
  data = {
    weighings: makeWeighings(1234),
    inventory: makeInventory(90),
    purchases: makeTransactions('purchase', 60),
    sales: makeTransactions('sale', 40),
    recyclers: makeRecyclers(300),
  }
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const params = (c.params ?? {}) as Params
    if (c.method === 'get') requests.push({ url, params })

    if (url === '/auth/me') {
      return {
        data: {
          id: 'me', email: 'me@x.co', full_name: 'Admin ECA', phone: null, id_type: 'CC', id_number: '9',
          user_type_code: 'eca', role_code: 'eca_admin', capabilities: capabilitiesForRole('eca_admin'), is_active: true,
          email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
        },
      }
    }
    if (url === '/weighings') {
      return { data: paged(data.weighings, params, (w) =>
        (!params.status || w.status === params.status) && (!params.material_code || w.material_code === params.material_code)) }
    }
    if (url === '/weighings/stats') return { data: { total_weighings_month: 1234, total_kg_month: 12340, pending_count: 309, by_material: [] } }
    if (url === '/inventory') {
      return { data: paged(data.inventory, params, (i) =>
        (!params.status || i.status === params.status) &&
        (!params.material_code || i.material_code === params.material_code) &&
        (!params.warehouse_id || i.warehouse_id === params.warehouse_id)) }
    }
    if (url === '/inventory/stats') return { data: { total_stock_kg: 9000, total_value: 90000, available_count: 30, low_stock_count: 30, out_of_stock_count: 30 } }
    if (url === '/inventory/materials') return { data: MATERIALS }
    if (url === '/inventory/warehouses') return { data: WAREHOUSES }
    if (url === '/transactions') {
      const source = params.type === 'sale' ? data.sales : data.purchases
      return { data: paged(source, params, (tx) => !params.status || tx.status === params.status) }
    }
    if (url === '/transactions/stats') {
      return { data: { total_purchases_month: 60, total_sales_month: 40, total_kg_purchases: 4800, total_kg_sales: 3200, total_value_purchases: 111000, total_value_sales: 222000, pending_count: 50 } }
    }
    if (url === '/users') {
      return { data: paged(data.recyclers, params, (r) => (!params.verification_status || r.verification_status === params.verification_status) &&
        (!params.q || r.full_name.toLowerCase().includes(String(params.q).toLowerCase()))) }
    }
    if (url.startsWith('/catalogs')) return { data: [] }
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

const nextPage = () => userEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
const rowsLike = (pattern: RegExp) => screen.queryAllByText(pattern)

describe('lists are paginated and filtered by the server', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    serveApi()
  })

  describe('weighings', () => {
    it('asks for one page, and shows the server total, not the rows loaded', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      expect(lastTo('/weighings')?.params).toMatchObject({ limit: 25, offset: 0 })
      expect(rowsLike(/^Reciclador \d+$/)).toHaveLength(25)
      expect(screen.getByText(/^1\.234 pesajes$/)).toBeInTheDocument()
    })

    it('never asks for more rows than the API allows', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      expect(requests.every((r) => r.params.limit === undefined || Number(r.params.limit) <= 100)).toBe(true)
    })

    it('the next page requests the next offset and shows the next rows', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      await nextPage()
      expect(await screen.findByText('Reciclador 25')).toBeInTheDocument()
      expect(lastTo('/weighings')?.params).toMatchObject({ limit: 25, offset: 25 })
      expect(screen.queryByText('Reciclador 0')).not.toBeInTheDocument()
    })

    it('a status filter is sent to the server, goes back to the first page and shows the filtered total', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      await nextPage()
      await screen.findByText('Reciclador 25')

      await userEvent.click(screen.getByText(t.pesajes.filterAllStatuses))
      await userEvent.click(await screen.findByRole('option', { name: t.pesajes.status.validated }))

      await waitFor(() => expect(lastTo('/weighings')?.params).toMatchObject({ status: 'validated', offset: 0 }))
      // 1234 weighings cycling through 4 statuses: 309 are "validated".
      expect(await screen.findByText(/^309 pesajes$/)).toBeInTheDocument()
    })

    it('a material filter comes from the catalog and is sent as material_code', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      await userEvent.click(screen.getByText(t.pesajes.filterAllMaterials))
      await userEvent.click(await screen.findByRole('option', { name: 'Papel' }))
      await waitFor(() => expect(lastTo('/weighings')?.params).toMatchObject({ material_code: 'paper', offset: 0 }))
      expect(await screen.findByText(/^617 pesajes$/)).toBeInTheDocument()
    })

    it('changing the page size asks for that many rows, from the first page', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      await nextPage()
      await screen.findByText('Reciclador 25')
      await userEvent.click(screen.getByRole('combobox', { name: new RegExp(t.ui.table.rowsPerPage.replace(':', '')) }))
      await userEvent.click(await screen.findByRole('option', { name: '50' }))
      await waitFor(() => expect(lastTo('/weighings')?.params).toMatchObject({ limit: 50, offset: 0 }))
    })

    it('moves back to the last existing page when the data shrinks under the current one', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      await nextPage()
      await screen.findByText('Reciclador 25')
      await nextPage()
      await screen.findByText('Reciclador 50')

      data.weighings = makeWeighings(30) // rows were removed: page 3 no longer exists
      await queryClient.invalidateQueries({ queryKey: ['weighings'] })

      await waitFor(() => expect(lastTo('/weighings')?.params).toMatchObject({ offset: 25 }))
      expect(await screen.findByText('Reciclador 29')).toBeInTheDocument()
    })
  })

  describe('inventory', () => {
    it('sends material, warehouse and status filters to the server, with options from the catalogs', async () => {
      renderAt('/inventario')
      expect((await screen.findAllByText('Bodega Norte', { selector: 'td' })).length).toBeGreaterThan(0)
      expect(lastTo('/inventory')?.params).toMatchObject({ limit: 25, offset: 0 })

      await userEvent.click(screen.getByText(t.inventario.filterAllWarehouses))
      await userEvent.click(await screen.findByRole('option', { name: 'Bodega Sur' }))
      await waitFor(() => expect(lastTo('/inventory')?.params).toMatchObject({ warehouse_id: 'b2', offset: 0 }))

      await userEvent.click(screen.getByText(t.inventario.filterAllStatuses))
      await userEvent.click(await screen.findByRole('option', { name: t.inventario.status.low_stock }))
      await waitFor(() => expect(lastTo('/inventory')?.params).toMatchObject({ warehouse_id: 'b2', status: 'low_stock' }))
    })
  })

  describe('transactions', () => {
    it('purchases and sales page independently, each with its own total', async () => {
      renderAt('/transacciones')
      await waitFor(() => expect(requests.some((r) => r.params.type === 'purchase')).toBe(true))
      expect(requestsTo('/transactions').find((r) => r.params.type === 'purchase' && r.params.limit === 25)?.params)
        .toMatchObject({ offset: 0 })
      expect(await screen.findByText(/1–25 de 60/)).toBeInTheDocument()

      const salesPageRequests = () => requestsTo('/transactions').filter((r) => r.params.type === 'sale' && r.params.limit === 25).length
      await waitFor(() => expect(salesPageRequests()).toBe(1))

      await nextPage()
      await waitFor(() =>
        expect(requestsTo('/transactions').some((r) => r.params.type === 'purchase' && r.params.offset === 25)).toBe(true))
      // Moving through purchases did not ask for the sales list again.
      expect(salesPageRequests()).toBe(1)
    })

    it('counts pending ones over all rows and takes the totals from the stats, not from the page', async () => {
      renderAt('/transacciones')
      // 60 purchases alternate pending/paid: 30 pending, counted on the server (limit 1 = just the total).
      await waitFor(() =>
        expect(requestsTo('/transactions').some((r) => r.params.type === 'purchase' && r.params.status === 'pending' && r.params.limit === 1)).toBe(true))
      expect(await screen.findByText(/^4\.800 kg$/)).toBeInTheDocument() // from /transactions/stats
      expect(await screen.findByText('30')).toBeInTheDocument()
    })
  })

  describe('recyclers', () => {
    it('sends the status filter to the server and pages through the padrón', async () => {
      renderAt('/recicladores')
      await screen.findByText('Persona 0')
      expect(lastTo('/users')?.params).toMatchObject({ limit: 25, offset: 0, user_type_code: 'recycler' })
      expect(screen.getByText(/^300 recicladores$/)).toBeInTheDocument()

      await userEvent.click(screen.getByText(t.recicladores.filterStatus.all))
      await userEvent.click(await screen.findByRole('option', { name: t.recicladores.filterStatus.verified }))
      await waitFor(() => expect(lastTo('/users')?.params).toMatchObject({ verification_status: 'verified', offset: 0 }))
      expect(await screen.findByText(/^100 recicladores$/)).toBeInTheDocument()
    })

    it('searches on the server, once per pause in typing, and starts again from the first page', async () => {
      renderAt('/recicladores')
      await screen.findByText('Persona 0')
      await nextPage()
      await waitFor(() => expect(lastTo('/users')?.params).toMatchObject({ offset: 25 }))
      const before = requestsTo('/users').length

      await userEvent.type(screen.getByPlaceholderText(t.recicladores.searchPlaceholder), 'Persona 31')
      await waitFor(() => expect(lastTo('/users')?.params).toMatchObject({ q: 'Persona 31', offset: 0 }))
      // Ten keystrokes, but the debounce sent at most a couple of requests (the page reset is one).
      expect(requestsTo('/users').length - before).toBeLessThanOrEqual(3)
      expect(await screen.findByText('Persona 31')).toBeInTheDocument()
      expect(screen.queryByText('Persona 0')).not.toBeInTheDocument()
    })

    it('does not send a search shorter than the server accepts', async () => {
      renderAt('/recicladores')
      await screen.findByText('Persona 0')
      await userEvent.type(screen.getByPlaceholderText(t.recicladores.searchPlaceholder), 'P')
      await new Promise((resolve) => setTimeout(resolve, 450))
      expect(requestsTo('/users').every((r) => r.params.q === undefined)).toBe(true)
    })
  })

  describe('weighing form recycler picker', () => {
    it('looks recyclers up on the server as the user types instead of listing them all', async () => {
      renderAt('/pesajes')
      await screen.findAllByText(/Persona|kg/, {}, { timeout: 3000 }).catch(() => undefined)
      await userEvent.click(await screen.findByRole('button', { name: t.pesajes.newWeighing }))
      const picker = await screen.findByRole('combobox', { name: new RegExp(t.pesajes.drawer.recycler) })
      await userEvent.type(picker, 'Persona 42')
      await waitFor(() =>
        expect(lastTo('/users')?.params).toMatchObject({ verification_status: 'verified', q: 'Persona 42', limit: 20 }),
      )
    })
  })

  describe('dashboard', () => {
    it('counts recyclers from the server total, without downloading 100 of them to filter here', async () => {
      renderAt('/')
      await waitFor(() => expect(requestsTo('/users').length).toBeGreaterThanOrEqual(2))
      const userRequests = requestsTo('/users')
      expect(userRequests.every((r) => Number(r.params.limit) === 1)).toBe(true)
      expect(userRequests.map((r) => r.params.verification_status).sort()).toEqual(['pending', 'verified'])
    })
  })

  describe('weighing drawer', () => {
    it('looks up the reference price with one filtered request instead of loading the inventory', async () => {
      renderAt('/pesajes')
      await screen.findByText('Reciclador 0')
      await userEvent.click(screen.getByRole('button', { name: 'Nuevo pesaje' }))
      const drawer = await screen.findByRole('presentation')

      await userEvent.click(within(drawer).getByLabelText(/Material/))
      await userEvent.click(await screen.findByRole('option', { name: 'Plástico' }))
      await userEvent.click(within(drawer).getByLabelText(/Bodega/))
      await userEvent.click(await screen.findByRole('option', { name: 'Bodega Norte' }))

      await waitFor(() =>
        expect(requestsTo('/inventory').some((r) => r.params.material_code === 'plastic' && r.params.warehouse_id === 'b1' && r.params.limit === 1)).toBe(true))
      // The first inventory row for plastic in Bodega Norte has price 300.
      await waitFor(() => expect(within(drawer).getByLabelText(/Precio/)).toHaveValue(300))
    })
  })
})
