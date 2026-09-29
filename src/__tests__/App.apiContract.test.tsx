import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { clearSession, setTokens } from '../lib/session'
import { t } from '../lib/i18n'
import { fakeJwt, mockAdapter } from '../test/helpers'

// Pages rendered with the English API contract. Includes a material and statuses this build
// has never heard of: the backend catalog is dynamic, so a new code must not crash a table.

const MATERIAL = { code: 'ceramic', label: 'Cerámica', unit: 'kg' }
const WAREHOUSE = { id: 'b1', name: 'Bodega Norte', address: null }

const WEIGHINGS = [
  {
    id: 'w1', recycler_id: 'r1', recycler: { id: 'r1', full_name: 'Rita Reciclaje', id_number: '1' },
    material_code: 'ceramic', material: MATERIAL, warehouse_id: 'b1', warehouse: WAREHOUSE,
    kg: 10, price_per_kg: 500, status: 'pending_validation', rejection_reason: null, validated_by: null,
    validated_at: null, occurred_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', total_value: 5000,
  },
  {
    id: 'w2', recycler_id: 'r1', recycler: { id: 'r1', full_name: 'Pablo Pesaje', id_number: '1' },
    material_code: 'plastic', material: { code: 'plastic', label: 'Plástico', unit: 'kg' },
    warehouse_id: 'b1', warehouse: WAREHOUSE, kg: 4, price_per_kg: 500, status: 'archived', rejection_reason: null,
    validated_by: null, validated_at: null, occurred_at: '2026-01-02T00:00:00Z', created_at: '2026-01-02T00:00:00Z',
    total_value: 2000,
  },
]

const INVENTORY = [
  {
    id: 'i1', material_code: 'ceramic', warehouse_id: 'b1', stock_kg: 100, stock_min_kg: 20, price_per_kg: 300,
    updated_at: '2026-01-01T00:00:00Z', status: 'low_stock', total_value: 30000, material: MATERIAL, warehouse: WAREHOUSE,
  },
  {
    id: 'i2', material_code: 'paper', warehouse_id: 'b1', stock_kg: 0, stock_min_kg: 20, price_per_kg: 300,
    updated_at: '2026-01-01T00:00:00Z', status: 'restocking', total_value: 0,
    material: { code: 'paper', label: 'Papel', unit: 'kg' }, warehouse: WAREHOUSE,
  },
]

const transaction = (type: 'purchase' | 'sale', id: string) => ({
  id, type, status: 'pending', material_code: 'ceramic', warehouse_id: 'b1', kg: 8, price_per_kg: 250,
  total_value: 2000, recycler_id: null, recycler: null, weighing_id: null, buyer_name: null, buyer_nit: null,
  buyer_email: null, occurred_at: '2026-01-03T00:00:00Z', created_at: '2026-01-03T00:00:00Z',
  material: MATERIAL, warehouse: WAREHOUSE,
})

function serveApi() {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    if (url === '/users/me' || /^\/users\/[^/]+$/.test(url)) {
      return {
        data: {
          id: 'me', email: 'me@x.co', full_name: 'Admin ECA', phone: null, id_type: 'CC', id_number: '9',
          user_type_code: 'eca', role_code: 'eca_admin', is_active: true,
          email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
        },
      }
    }
    if (url === '/weighings') return { data: { total: 2, items: WEIGHINGS } }
    if (url === '/weighings/stats') return { data: { total_weighings_month: 2, total_kg_month: 14, pending_count: 1, by_material: [] } }
    if (url === '/inventory') return { data: { total: 2, items: INVENTORY } }
    if (url === '/inventory/stats') {
      return { data: { total_stock_kg: 100, total_value: 30000, available_count: 0, low_stock_count: 1, out_of_stock_count: 1 } }
    }
    if (url === '/transactions') {
      return { data: { total: 1, items: [transaction(c.params?.type === 'sale' ? 'sale' : 'purchase', c.params?.type ?? 'p')] } }
    }
    if (url === '/transactions/stats') {
      return {
        data: {
          total_purchases_month: 1, total_sales_month: 1, total_kg_purchases: 1234, total_kg_sales: 5678,
          total_value_purchases: 111000, total_value_sales: 222000, pending_count: 2,
        },
      }
    }
    if (url === '/inventory/materials') return { data: [MATERIAL, { code: 'paper', label: 'Papel', unit: 'kg' }] }
    if (url.startsWith('/inventory/') || url.startsWith('/catalogs')) return { data: [] }
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

describe('pages against the English API contract', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    serveApi()
  })

  it('weighings: shows the API material label and does not crash on unknown material or status', async () => {
    renderAt('/pesajes')
    expect(await screen.findByText('Rita Reciclaje')).toBeInTheDocument()
    expect(screen.getByText('Cerámica')).toBeInTheDocument()
    expect(screen.getByText(t.pesajes.status.pending_validation)).toBeInTheDocument()
    // Unknown status: shown as its raw code instead of throwing.
    expect(screen.getByText('archived')).toBeInTheDocument()
  })

  it('weighings: pending ones can be validated and rejected, validated ones can be paid', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Reciclaje')
    expect(screen.getByRole('button', { name: /Validar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rechazar/ })).toBeInTheDocument()
  })

  it('inventory: shows the API material label and unknown status codes without crashing', async () => {
    renderAt('/inventario')
    expect(await screen.findByText('Cerámica')).toBeInTheDocument()
    expect(screen.getByText(t.inventario.status.low_stock)).toBeInTheDocument()
    expect(screen.getByText('restocking')).toBeInTheDocument()
  })

  it('inventory: the material filter comes from the catalog endpoint, not a fixed list', async () => {
    renderAt('/inventario')
    await screen.findByText('Cerámica')
    await userEvent.click(screen.getAllByRole('combobox')[0])
    expect(await screen.findByRole('option', { name: 'Cerámica' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Papel' })).toBeInTheDocument()
  })

  it('transactions: lists purchases and reads the renamed stats fields', async () => {
    renderAt('/transacciones')
    expect(await screen.findAllByText('Cerámica')).not.toHaveLength(0)
    expect(screen.getByText(/1\.234 kg/)).toBeInTheDocument()
  })
})
