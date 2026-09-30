import type { Page, Route } from '@playwright/test'
import { API_URL } from '../playwright.config'

// A small stateful stand-in for the backend: it remembers what the test changed (a recycler gets
// verified, a weighing gets registered) so the screens can be followed across a whole flow.

const MATERIAL = { code: 'plastic', label: 'Plástico', unit: 'kg' }
const WAREHOUSE = { id: 'b1', name: 'Bodega Norte', address: null }
const NOW = '2026-01-01T00:00:00Z'

type Status = 'pending' | 'verified' | 'rejected'

interface Recycler {
  id: string
  full_name: string
  email: string
  id_type: string
  id_number: string
  phone: string | null
  verification_status: Status
  rejection_reason: string | null
  verified_at: string | null
  profile_picture: null
  id_picture: null
  created_at: string
  updated_at: string
}

interface Weighing {
  id: string
  /** Null when the material came from someone who is not registered (see `seller_*`). */
  recycler_id: string | null
  recycler: { id: string; full_name: string; id_number: string } | null
  affiliation_status: 'linked' | 'unlinked_association' | 'independent'
  seller_name: string | null
  seller_id_type: string | null
  seller_id_number: string | null
  material_code: string
  material: typeof MATERIAL
  warehouse_id: string
  warehouse: typeof WAREHOUSE
  kg: number
  price_per_kg: number
  status: string
  rejection_reason: string | null
  validated_by: string | null
  validated_at: string | null
  occurred_at: string
  created_at: string
  total_value: number
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (sub: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub })}.sig`
const subjectOf = (authorization: string | undefined) =>
  JSON.parse(Buffer.from((authorization ?? '').split('.')[1] ?? 'e30', 'base64url').toString()).sub as string | undefined

// Two people, as `GET /auth/me` announces them: the ECA admin weighs, the Association admin verifies recyclers.
export const ECA_ADMIN = {
  id: 'eca-1', email: 'admin@eca.test', password: 'CorrectHorse-9', full_name: 'Ana Administradora',
  user_type_code: 'eca', role_code: 'eca_admin',
  capabilities: [
    'inventory.edit', 'inventory.view', 'recyclers.view', 'transactions.create', 'transactions.manage',
    'transactions.pay', 'transactions.view', 'weighings.create', 'weighings.pay', 'weighings.review', 'weighings.view',
  ],
}
export const ASSOCIATION_ADMIN = {
  id: 'assoc-1', email: 'admin@asociacion.test', password: 'CorrectHorse-9', full_name: 'Aura Asociada',
  user_type_code: 'association', role_code: 'association_admin',
  capabilities: [
    'inventory.view', 'recyclers.verify', 'recyclers.view', 'transactions.pay', 'transactions.view',
    'weighings.pay', 'weighings.review', 'weighings.view',
  ],
}
const PEOPLE = [ECA_ADMIN, ASSOCIATION_ADMIN]

export interface FakeApi {
  recyclers: Recycler[]
  weighings: Weighing[]
  /** Every request the app made, as "METHOD /path". */
  calls: string[]
}

export async function installFakeApi(page: Page): Promise<FakeApi> {
  const state: FakeApi = {
    recyclers: [
      {
        id: 'r1', full_name: 'Rita Reciclaje', email: 'rita@x.co', id_type: 'CC', id_number: '1001', phone: null,
        verification_status: 'pending', rejection_reason: null, verified_at: null, profile_picture: null, id_picture: null,
        created_at: NOW, updated_at: NOW,
      },
    ],
    weighings: [],
    calls: [],
  }

  const json = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

  await page.route(`${API_URL}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    const query = url.searchParams
    state.calls.push(`${method} ${path}`)

    // The browser sends a preflight because of the Authorization header.
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      })
    }
    const respond = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(data),
      })
    void json

    if (path === '/auth/login' && method === 'POST') {
      const body = request.postDataJSON() as { email: string; password: string }
      const person = PEOPLE.find((p) => p.email === body.email && p.password === body.password)
      if (!person) return respond({ detail: 'Credenciales inválidas', code: 'invalid_credentials' }, 401)
      return respond({ access_token: jwt(person.id), refresh_token: 'refresh-1', token_type: 'bearer', expires_in: 1800 })
    }
    if (path === '/auth/me') {
      const person = PEOPLE.find((p) => p.id === subjectOf(request.headers()['authorization']?.replace('Bearer ', '')))
      if (!person) return respond({ detail: 'Token inválido o expirado', code: 'invalid_token' }, 401)
      return respond({
        id: person.id, email: person.email, full_name: person.full_name, phone: null, id_type: 'CC', id_number: '9',
        user_type_code: person.user_type_code, role_code: person.role_code, is_active: true,
        email_verified_at: NOW, created_at: NOW, capabilities: person.capabilities,
      })
    }

    if (path === '/users' && method === 'GET') {
      const status = query.get('verification_status')
      const q = query.get('q')?.toLowerCase()
      const rows = state.recyclers.filter(
        (r) => (!status || r.verification_status === status) && (!q || r.full_name.toLowerCase().includes(q)),
      )
      return respond({ total: rows.length, limit: Number(query.get('limit') ?? 25), offset: 0, items: rows })
    }
    const verification = path.match(/^\/users\/([^/]+)\/verification-status$/)
    if (verification && method === 'PATCH') {
      const recycler = state.recyclers.find((r) => r.id === verification[1])
      const body = request.postDataJSON() as { status: Status }
      if (recycler) recycler.verification_status = body.status
      return respond(recycler)
    }

    if (path === '/recyclers/lookup' && method === 'GET') {
      const found = state.recyclers.find((r) => r.id_number === query.get('document'))
      if (!found) return respond({ detail: 'x', code: 'recycler_not_found' }, 404)
      return respond({
        id: found.id, full_name: found.full_name, id_type: found.id_type, id_number: found.id_number, is_active: true,
        verification_status: found.verification_status,
        association: { id: 'a1', legal_name: 'Asociación Uno', city: 'Bogotá' }, affiliation: 'linked',
      })
    }

    if (path === '/weighings' && method === 'GET') {
      const status = query.get('status')
      const rows = state.weighings.filter((w) => !status || w.status === status)
      return respond({ total: rows.length, items: rows })
    }
    if (path === '/weighings' && method === 'POST') {
      // Exactly one of `recycler_id` (registered) or `seller` (not registered), like the real API.
      const body = request.postDataJSON() as {
        recycler_id?: string; seller?: { full_name: string; id_type: string; id_number: string }; kg: number; price_per_kg: number
      }
      if ((body.recycler_id === undefined) === (body.seller === undefined)) return respond({ detail: 'x', code: 'validation_error' }, 422)
      const recycler = body.recycler_id ? state.recyclers.find((r) => r.id === body.recycler_id)! : null
      const weighing: Weighing = {
        id: `w${state.weighings.length + 1}`, recycler_id: recycler?.id ?? null,
        recycler: recycler ? { id: recycler.id, full_name: recycler.full_name, id_number: recycler.id_number } : null,
        affiliation_status: recycler ? 'linked' : 'independent',
        seller_name: body.seller?.full_name ?? null, seller_id_type: body.seller?.id_type ?? null,
        seller_id_number: body.seller?.id_number ?? null,
        material_code: MATERIAL.code, material: MATERIAL, warehouse_id: WAREHOUSE.id, warehouse: WAREHOUSE,
        kg: body.kg, price_per_kg: body.price_per_kg, status: 'pending_validation', rejection_reason: null,
        validated_by: null, validated_at: null, occurred_at: NOW, created_at: NOW, total_value: body.kg * body.price_per_kg,
      }
      state.weighings.unshift(weighing)
      return respond(weighing, 201)
    }
    const weighingStatus = path.match(/^\/weighings\/([^/]+)\/status$/)
    if (weighingStatus && method === 'PATCH') {
      const weighing = state.weighings.find((w) => w.id === weighingStatus[1])
      const body = request.postDataJSON() as { status: string }
      if (weighing) weighing.status = body.status
      return respond(weighing)
    }
    if (path === '/weighings/stats') {
      return respond({
        total_weighings_month: state.weighings.length,
        total_kg_month: state.weighings.reduce((sum, w) => sum + w.kg, 0),
        pending_count: state.weighings.filter((w) => w.status === 'pending_validation').length,
        by_material: [],
      })
    }

    if (path === '/inventory/materials') return respond([MATERIAL])
    if (path === '/inventory/warehouses') return respond([WAREHOUSE])
    if (path === '/inventory') {
      return respond({
        total: 1, limit: 25, offset: 0,
        items: [{
          id: 'i1', material_code: 'plastic', warehouse_id: 'b1', stock_kg: 100, stock_min_kg: 20, price_per_kg: 300,
          updated_at: NOW, status: 'available', total_value: 30000, material: MATERIAL, warehouse: WAREHOUSE,
        }],
      })
    }
    if (path === '/catalogs/document-types') return respond([{ code: 'CC', label: 'Cédula de ciudadanía' }])

    // Anything else the app asks for gets an empty page, so an unexpected call is visible in `calls`.
    return respond({ total: 0, items: [] })
  })

  return state
}
