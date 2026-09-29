import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { clearSession, setTokens } from '../lib/session'
import { t } from '../lib/i18n'
import { fakeJwt, mockAdapter } from '../test/helpers'
import { capabilitiesForRole } from '../test/capabilities'

// Simulates a page file that cannot be downloaded (a new version was deployed, or the connection
// dropped): the browser rejects the dynamic import with this message.
vi.mock('../lazyPages', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lazyPages')>()
  const { lazy } = await import('react')
  return {
    ...actual,
    Inventory: lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/Inventory-abc123.js'))),
  }
})

function serveApi() {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    if (url === '/auth/me') {
      return {
        data: {
          id: 'me', email: 'me@x.co', full_name: 'Admin ECA', phone: null, id_type: 'CC', id_number: '9',
          user_type_code: 'eca', role_code: 'eca_admin', capabilities: capabilitiesForRole('eca_admin'), is_active: true,
          email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
        },
      }
    }
    if (url.startsWith('/catalogs')) return { data: [] }
    return { data: { total: 0, items: [] } }
  })
}

describe('a page that fails to download', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    serveApi()
    window.history.pushState({}, '', '/inventario')
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    )
  })
  afterEach(() => vi.restoreAllMocks())

  it('asks the user to reload, since retrying the same import can never succeed', async () => {
    expect(await screen.findByText(t.errorScreen.chunkMessage)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.errorScreen.reload })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.errorScreen.retry })).not.toBeInTheDocument()
  })

  it('keeps the menu working, so the other pages stay reachable', async () => {
    await screen.findByText(t.errorScreen.chunkMessage)
    await userEvent.click(screen.getByRole('link', { name: t.nav.recicladores }))
    expect(await screen.findByRole('heading', { name: t.recicladores.title })).toBeInTheDocument()
    expect(screen.queryByText(t.errorScreen.chunkMessage)).not.toBeInTheDocument()
  })
})
