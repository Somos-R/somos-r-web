import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { RequirePermission } from '../RequirePermission'
import { getHomePath } from '../../../routes'
import { can } from '../../../lib/permissions'
import { t } from '../../../lib/i18n'
import type { StaffRole } from '../../../lib/permissions'

let mockUser: { user_type: string; role: StaffRole | null } | null = null
vi.mock('../../../hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }))

const Where = () => <div data-testid="where">{useLocation().pathname}</div>

function renderGuard(path: string, permission: 'weighings.view' | 'dashboard.view', redirectIfDenied = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route
          path="*"
          element={
            <RequirePermission permission={permission} redirectIfDenied={redirectIfDenied}>
              <div>secret page</div>
            </RequirePermission>
          }
        />
        <Route path="/recicladores" element={<div>recyclers page</div>} />
        <Route path="/configuracion" element={<div>settings page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequirePermission', () => {
  beforeEach(() => {
    mockUser = null
  })

  it('renders the page when the role has the permission', () => {
    mockUser = { user_type: 'eca', role: 'eca_operator' }
    renderGuard('/pesajes', 'weighings.view')
    expect(screen.getByText('secret page')).toBeInTheDocument()
  })

  it('shows the 403 screen instead of the page when the role lacks it', () => {
    mockUser = { user_type: 'association', role: 'route_manager' }
    renderGuard('/pesajes', 'weighings.view')
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
    expect(screen.getByText(t.forbidden.title)).toBeInTheDocument()
  })

  it('the 403 screen sends the user to their first allowed page', async () => {
    mockUser = { user_type: 'association', role: 'route_manager' }
    renderGuard('/pesajes', 'weighings.view')
    await userEvent.click(screen.getByRole('button', { name: t.forbidden.back }))
    expect(screen.getByText('recyclers page')).toBeInTheDocument()
  })

  it('redirects instead of showing 403 when asked (the "/" route)', () => {
    mockUser = { user_type: 'association', role: 'route_manager' }
    renderGuard('/', 'dashboard.view', true)
    expect(screen.getByTestId('where')).toHaveTextContent('/recicladores')
  })

  it('a user without a role only reaches settings', () => {
    mockUser = { user_type: 'recycler', role: null }
    renderGuard('/', 'dashboard.view', true)
    expect(screen.getByText('settings page')).toBeInTheDocument()
  })

  it('denies everything when nobody is signed in', () => {
    renderGuard('/pesajes', 'weighings.view')
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })
})

describe('getHomePath', () => {
  const home = (role: StaffRole | null, user_type: string) => getHomePath((p) => can({ user_type, role }, p))

  it('sends each kind of user to the first page they can open', () => {
    expect(home('eca_admin', 'eca')).toBe('/')
    expect(home('association_operator', 'association')).toBe('/')
    expect(home('route_manager', 'association')).toBe('/recicladores')
    expect(home(null, 'recycler')).toBe('/configuracion')
  })
})
