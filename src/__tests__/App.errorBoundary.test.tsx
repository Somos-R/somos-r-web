import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession, setTokens } from '../lib/session'
import { t } from '../lib/i18n'
import { fakeJwt, mockAdapter } from '../test/helpers'

// A real page crashing while it renders: the weighing comes back without its recycler, which
// makes Weighings throw. The rest of the app must keep working around it.

const BROKEN_WEIGHING = {
  id: 'w1', recycler_id: 'r1', recycler: null, material_code: 'plastic',
  material: { code: 'plastic', label: 'Plástico', unit: 'kg' }, warehouse_id: 'b1',
  warehouse: { id: 'b1', name: 'Bodega', address: null }, kg: 1, price_per_kg: 1, status: 'validated',
  rejection_reason: null, validated_by: null, validated_at: null, occurred_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z', total_value: 1,
}

function serveApi() {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    if (/^\/users\/[^/]+$/.test(url)) {
      return {
        data: {
          id: 'me', email: 'me@x.co', full_name: 'Admin ECA', phone: null, id_type: 'CC', id_number: '9',
          user_type_code: 'eca', role_code: 'eca_admin', is_active: true,
          email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
        },
      }
    }
    if (url === '/weighings') return { data: { total: 1, items: [BROKEN_WEIGHING] } }
    if (url === '/weighings/stats') return { data: { total_weighings_month: 0, total_kg_month: 0, pending_count: 0, by_material: [] } }
    if (url === '/inventory/stats') return { data: { total_stock_kg: 0, total_value: 0, available_count: 0, low_stock_count: 0, out_of_stock_count: 0 } }
    if (url === '/inventory') return { data: { total: 0, items: [] } }
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

describe('a page that crashes while rendering', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    serveApi()
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows an error screen inside the layout instead of a blank page', async () => {
    renderAt('/pesajes')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(t.errorScreen.title)).toBeInTheDocument()
  })

  it('keeps the menu working, so the user can leave the broken page', async () => {
    renderAt('/pesajes')
    await screen.findByRole('alert')
    // The sidebar is outside the boundary and still there.
    await userEvent.click(screen.getByRole('link', { name: t.nav.inventario }))
    expect(await screen.findByRole('heading', { name: t.inventario.title })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/inventario')
  })

  it('does not leak the technical error to the user in production', async () => {
    vi.stubEnv('DEV', false)
    renderAt('/pesajes')
    await screen.findByRole('alert')
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})
