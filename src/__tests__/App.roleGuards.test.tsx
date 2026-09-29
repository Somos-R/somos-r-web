import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { clearSession, setTokens } from '../lib/session'
import { ROLE_USER_TYPE, type StaffRole } from '../lib/permissions'
import { t } from '../lib/i18n'
import { fakeJwt, mockAdapter } from '../test/helpers'
import { capabilitiesForRole } from '../test/capabilities'

const RECYCLER = {
  id: 'r1', full_name: 'Rita Reciclaje', email: 'rita@x.co', id_type: 'CC', id_number: '1234567',
  phone: null, verification_status: 'pending', rejection_reason: null, verified_at: null,
  profile_picture: null, id_picture: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

const WEIGHING = {
  id: 'w1', recycler_id: 'r1', recycler: { id: 'r1', full_name: 'Rita Reciclaje', id_number: '1234567' },
  material_code: 'plastic', material: { code: 'plastic', label: 'Plástico', unit: 'kg' },
  warehouse_id: 'b1', warehouse: { id: 'b1', name: 'Bodega 1', address: null },
  kg: 10, price_per_kg: 500, status: 'validated', rejection_reason: null, validated_by: null, validated_at: null,
  occurred_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', total_value: 5000,
}

/** Signs in as a staff member and serves just enough API for the pages under test. */
function signInAs(role: StaffRole | null, userType = role ? ROLE_USER_TYPE[role] : 'recycler') {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    if (url === '/auth/me') {
      return {
        data: {
          id: 'me', email: 'me@x.co', full_name: 'Persona Prueba', phone: null, id_type: 'CC', id_number: '9',
          user_type_code: userType, role_code: role, capabilities: capabilitiesForRole(role), is_active: true, email_verified_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      }
    }
    if (url === '/users') return { data: { total: 1, limit: 100, offset: 0, items: [RECYCLER] } }
    if (url === '/weighings') return { data: { total: 1, items: [WEIGHING] } }
    if (url === '/weighings/stats') return { data: { total_weighings_month: 0, total_kg_month: 0, pending_count: 0, by_material: [] } }
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

const navEntry = (label: string) => screen.queryByRole('link', { name: label })

describe('role-based navigation and guards (full app)', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
  })

  it('a route manager only sees recyclers and settings, and "/" sends them to recyclers', async () => {
    signInAs('route_manager')
    renderAt('/')
    expect(await screen.findByText(t.recicladores.title)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/recicladores')
    expect(navEntry(t.nav.recicladores)).toBeInTheDocument()
    expect(navEntry(t.nav.configuracion)).toBeInTheDocument()
    for (const hidden of [t.nav.dashboard, t.nav.pesajes, t.nav.inventario, t.nav.transacciones, t.nav.reportes]) {
      expect(navEntry(hidden)).not.toBeInTheDocument()
    }
  })

  it('the menu is a labelled navigation region whose entries are links, with the current page marked', async () => {
    signInAs('eca_admin')
    renderAt('/inventario')
    await screen.findByRole('heading', { name: t.inventario.title, level: 1 })
    const nav = screen.getByRole('navigation', { name: t.sidebar.navigation })
    expect(within(nav).getByRole('link', { name: t.nav.inventario })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: t.nav.pesajes })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('link', { name: t.nav.pesajes })).toHaveAttribute('href', '/pesajes')
  })

  it('typing a forbidden URL shows the 403 screen, not the page', async () => {
    signInAs('route_manager')
    renderAt('/pesajes')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(screen.queryByText(t.pesajes.title)).not.toBeInTheDocument()
  })

  it('a recycler who logs into the portal only gets settings', async () => {
    signInAs(null, 'recycler')
    renderAt('/')
    expect(await screen.findByText(t.configuracion.title)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/configuracion')
    expect(navEntry(t.nav.recicladores)).not.toBeInTheDocument()
  })

  it('staff without a role get no module access and are told their account is pending a role', async () => {
    signInAs(null, 'eca')
    renderAt('/inventario')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(screen.getByText(t.account.pendingRole)).toBeInTheDocument()
    expect(navEntry(t.nav.inventario)).not.toBeInTheDocument()
  })

  it('association staff without a role get the same pending-role notice', async () => {
    signInAs(null, 'association')
    renderAt('/')
    expect(await screen.findByText(t.account.pendingRole)).toBeInTheDocument()
  })

  it('users with a role, and recyclers, do not see the pending-role notice', async () => {
    signInAs('route_manager')
    renderAt('/recicladores')
    await screen.findByRole('heading', { name: t.recicladores.title })
    expect(screen.queryByText(t.account.pendingRole)).not.toBeInTheDocument()
  })

  it('a recycler is not told to wait for a role', async () => {
    signInAs(null, 'recycler')
    renderAt('/configuracion')
    await screen.findByRole('heading', { name: t.configuracion.title })
    expect(screen.queryByText(t.account.pendingRole)).not.toBeInTheDocument()
  })

  it('an unknown legacy role is treated as no role at all', async () => {
    signInAs('superadmin' as StaffRole, 'eca')
    renderAt('/pesajes')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
  })
})

describe('role-based actions inside pages (full app)', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
  })

  it('association operators can verify recyclers', async () => {
    signInAs('association_operator')
    renderAt('/recicladores')
    expect(await screen.findByRole('button', { name: t.common.validate })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.recicladores.reject.button })).toBeInTheDocument()
  })

  it('ECA staff can register recyclers but cannot verify them', async () => {
    signInAs('eca_admin')
    renderAt('/recicladores')
    expect(await screen.findByText('Rita Reciclaje')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.recicladores.registerButton })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.common.validate })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.recicladores.reject.button })).not.toBeInTheDocument()
  })

  it('the scale operator can register weighings but not mark them paid', async () => {
    signInAs('eca_operator')
    renderAt('/pesajes')
    expect(await screen.findByRole('button', { name: 'Nuevo pesaje' })).toBeInTheDocument()
    await screen.findByText('Rita Reciclaje')
    expect(screen.queryByRole('button', { name: 'Marcar pagado' })).not.toBeInTheDocument()
  })

  it('association admins can mark weighings paid but not create them', async () => {
    signInAs('association_admin')
    renderAt('/pesajes')
    expect(await screen.findByRole('button', { name: 'Marcar pagado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuevo pesaje' })).not.toBeInTheDocument()
  })
})
