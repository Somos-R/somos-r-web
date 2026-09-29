import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { setTokens } from '../lib/session'
import { fakeJwt, mockAdapter } from './helpers'

// A small fake API with one row of each kind (pending / validated / rejected...), shared by the
// accessibility and keyboard tests so every control shows up on screen.

const MATERIALS = [
  { code: 'plastic', label: 'Plástico', unit: 'kg' },
  { code: 'paper', label: 'Papel', unit: 'kg' },
]
const WAREHOUSES = [{ id: 'b1', name: 'Bodega Norte', address: null }]

const weighing = (id: string, name: string, status: string, reason: string | null = null) => ({
  id, recycler_id: 'r1', recycler: { id: 'r1', full_name: name, id_number: '1' }, material_code: 'plastic',
  material: MATERIALS[0], warehouse_id: 'b1', warehouse: WAREHOUSES[0], kg: 10, price_per_kg: 500, status,
  rejection_reason: reason, validated_by: null, validated_at: null, occurred_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z', total_value: 5000,
})

const WEIGHINGS = [
  weighing('w1', 'Rita Pendiente', 'pending_validation'),
  weighing('w2', 'Vera Validada', 'validated'),
  weighing('w3', 'Rosa Rechazada', 'rejected', 'Material mojado'),
]

const INVENTORY = [
  { id: 'i1', material_code: 'plastic', warehouse_id: 'b1', stock_kg: 100, stock_min_kg: 20, price_per_kg: 300, updated_at: '2026-01-01T00:00:00Z', status: 'available', total_value: 30000, material: MATERIALS[0], warehouse: WAREHOUSES[0] },
  { id: 'i2', material_code: 'paper', warehouse_id: 'b1', stock_kg: 0, stock_min_kg: 20, price_per_kg: 200, updated_at: '2026-01-01T00:00:00Z', status: 'out_of_stock', total_value: 0, material: MATERIALS[1], warehouse: WAREHOUSES[0] },
]

const transaction = (type: 'purchase' | 'sale', id: string, status: string) => ({
  id, type, status, material_code: 'plastic', warehouse_id: 'b1', kg: 8, price_per_kg: 250, total_value: 2000,
  recycler_id: null, recycler: null, weighing_id: null, buyer_name: type === 'sale' ? 'Ecoplas SAS' : null,
  buyer_nit: '900123', buyer_email: null, occurred_at: '2026-01-03T00:00:00Z', created_at: '2026-01-03T00:00:00Z',
  material: MATERIALS[0], warehouse: WAREHOUSES[0],
})

const RECYCLERS = ['pending', 'verified', 'rejected'].map((status, i) => ({
  id: `u${i}`, full_name: `Persona ${status}`, email: `p${i}@x.co`, id_type: 'CC', id_number: String(1000 + i), phone: '3001234567',
  verification_status: status, rejection_reason: null, verified_at: null, profile_picture: null, id_picture: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}))

export function serveApi(role: 'eca_admin' | 'association_admin' = 'eca_admin') {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  const userType = role === 'eca_admin' ? 'eca' : 'association'
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const params = (c.params ?? {}) as Record<string, string>
    if (/^\/users\/[^/]+$/.test(url)) {
      return { data: { id: 'me', email: 'me@x.co', full_name: 'Persona Prueba', phone: null, id_type: 'CC', id_number: '9', user_type_code: userType, role_code: role, is_active: true, email_verified_at: null, created_at: '2026-01-01T00:00:00Z' } }
    }
    if (url === '/weighings') return { data: { total: WEIGHINGS.length, items: WEIGHINGS } }
    if (url === '/weighings/stats') return { data: { total_weighings_month: 3, total_kg_month: 30, pending_count: 1, by_material: [] } }
    if (url === '/inventory') return { data: { total: INVENTORY.length, items: INVENTORY } }
    if (url === '/inventory/stats') return { data: { total_stock_kg: 100, total_value: 30000, available_count: 1, low_stock_count: 0, out_of_stock_count: 1 } }
    if (url === '/inventory/materials') return { data: MATERIALS }
    if (url === '/inventory/warehouses') return { data: WAREHOUSES }
    if (url === '/transactions') {
      const type = params.type === 'sale' ? 'sale' : 'purchase'
      return { data: { total: 2, items: [transaction(type, `${type}1`, 'pending'), transaction(type, `${type}2`, 'paid')] } }
    }
    if (url === '/transactions/stats') return { data: { total_purchases_month: 2, total_sales_month: 2, total_kg_purchases: 16, total_kg_sales: 16, total_value_purchases: 4000, total_value_sales: 4000, pending_count: 2 } }
    if (url === '/users') return { data: { total: RECYCLERS.length, limit: 25, offset: 0, items: RECYCLERS } }
    if (url === '/catalogs/document-types') return { data: [{ code: 'CC', label: 'Cédula de Ciudadanía' }, { code: 'CE', label: 'Cédula de Extranjería' }] }
    if (url.startsWith('/catalogs')) return { data: [] }
    return { data: { total: 0, items: [] } }
  })
}

export function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

