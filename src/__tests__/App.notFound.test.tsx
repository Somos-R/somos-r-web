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

describe('page not found', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
    apiClient.defaults.adapter = mockAdapter((c) =>
      String(c.url) === '/auth/me'
        ? {
            data: {
              id: 'me', email: 'me@x.co', full_name: 'Admin ECA', phone: null, id_type: 'CC', id_number: '9',
              user_type_code: 'eca', role_code: 'eca_admin', capabilities: capabilitiesForRole('eca_admin'), is_active: true,
              email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
            },
          }
        : { data: { total: 0, items: [] } },
    )
  })
  afterEach(() => vi.restoreAllMocks())

  it('goes back home through the router, without reloading the whole app', async () => {
    // A plain <a href> makes jsdom log "Not implemented: navigation" (a full page load).
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.history.pushState({}, '', '/esta-pagina-no-existe')
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(t.notFound.title)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: t.notFound.backLink }))

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText(t.notFound.title)).not.toBeInTheDocument()
    expect(logged.mock.calls.some((call) => String(call[0]).includes('Not implemented: navigation'))).toBe(false)
  })
})
