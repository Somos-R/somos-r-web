import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosAdapter } from 'axios'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession, setTokens } from '../lib/session'
import { t } from '../lib/i18n'
import { fakeJwt, mockAdapter } from '../test/helpers'
import { capabilitiesForRole } from '../test/capabilities'
import { renderAt } from '../test/fakeApi'
import { saveBlob } from '../lib/download'
import type { StaffRole } from '../lib/permissions'

vi.mock('../lib/download', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/download')>()), saveBlob: vi.fn() }))

// Reportes: built from the stats each domain already exposes, plus a CSV download per domain.
// No new backend endpoint — only the page was never reconnected after the MUI rewrite.

const MATERIALS = [
  { code: 'plastic', label: 'Plástico', unit: 'kg' },
  { code: 'paper', label: 'Papel', unit: 'kg' },
]

let exportRequests: string[]

/** Signs in as any staff role (including ones the shared fake API doesn't cover) and serves one
 * fixed set of stats, so the test only varies the role's capabilities. */
function serve(role: StaffRole) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  const userType = role.startsWith('eca') ? 'eca' : 'association'
  exportRequests = []
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    if (url === '/auth/me') {
      return { data: { id: 'me', email: 'me@x.co', full_name: 'Persona Prueba', phone: null, id_type: 'CC', id_number: '9', user_type_code: userType, role_code: role, capabilities: capabilitiesForRole(role), is_active: true, email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' } }
    }
    if (url === '/weighings/stats') return { data: { total_weighings_month: 7, total_kg_month: 150.5, pending_count: 2, by_material: [{ material: 'plastic', kg: 100 }, { material: 'paper', kg: 50.5 }] } }
    if (url === '/inventory/stats') return { data: { total_stock_kg: 300, total_value: 90000, available_count: 2, low_stock_count: 1, out_of_stock_count: 0 } }
    if (url === '/transactions/stats') return { data: { total_purchases_month: 5, total_sales_month: 3, total_kg_purchases: 120, total_kg_sales: 60, total_value_purchases: 36000, total_value_sales: 18000, pending_count: 1 } }
    if (url === '/inventory/materials') return { data: MATERIALS }
    if (url === '/weighings/export.csv' || url === '/inventory/export.csv' || url === '/transactions/export.csv') {
      exportRequests.push(url)
      return { status: 200, data: new Blob(['a,b\n']), statusText: 'OK', headers: {}, config: c }
    }
    return { data: { total: 0, items: [] } }
  })
}

const exportButtons = () => screen.getAllByRole('button', { name: t.common.exportCsv.button })

describe('reports page', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    vi.mocked(saveBlob).mockClear()
  })

  it('shows the monthly weighings summary and the material breakdown', async () => {
    serve('eca_admin')
    renderAt('/reportes')
    await screen.findByText(t.reportes.weighings.title)
    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(screen.getByText(/150,5\s*kg/)).toBeInTheDocument()
    expect(screen.getByText('Plástico')).toBeInTheDocument()
    expect(screen.getByText('Papel')).toBeInTheDocument()
  })

  it('shows inventory and transactions for a role that can see both', async () => {
    serve('eca_admin')
    renderAt('/reportes')
    await screen.findByText(t.reportes.inventory.title)
    expect(screen.getByText(t.reportes.transactions.title)).toBeInTheDocument()
    expect(exportButtons()).toHaveLength(3)
  })

  it('hides transactions for a role without transactions.view, but keeps inventory', async () => {
    serve('association_operator')
    renderAt('/reportes')
    await screen.findByText(t.reportes.inventory.title)
    expect(screen.queryByText(t.reportes.transactions.title)).not.toBeInTheDocument()
    expect(exportButtons()).toHaveLength(2)
  })

  it('downloads each section\'s CSV with its own file name', async () => {
    serve('eca_admin')
    renderAt('/reportes')
    await screen.findByText(t.reportes.transactions.title)
    const [weighings, inventory, transactions] = exportButtons()

    await userEvent.click(weighings)
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1))
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toMatch(/^pesajes-\d{4}-\d{2}-\d{2}\.csv$/)

    await userEvent.click(inventory)
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(2))
    expect(vi.mocked(saveBlob).mock.calls[1][1]).toMatch(/^inventario-\d{4}-\d{2}-\d{2}\.csv$/)

    await userEvent.click(transactions)
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(3))
    expect(vi.mocked(saveBlob).mock.calls[2][1]).toMatch(/^transacciones-\d{4}-\d{2}-\d{2}\.csv$/)

    expect(exportRequests).toEqual(['/weighings/export.csv', '/inventory/export.csv', '/transactions/export.csv'])
  })

  it('shows a message instead of a table when there were no weighings this month', async () => {
    serve('eca_admin')
    const base = apiClient.defaults.adapter as AxiosAdapter
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/weighings/stats') {
        return { status: 200, data: { total_weighings_month: 0, total_kg_month: 0, pending_count: 0, by_material: [] }, statusText: 'OK', headers: {}, config }
      }
      return base(config)
    }
    renderAt('/reportes')
    await screen.findByText(t.reportes.weighings.emptyMaterials)
  })
})
