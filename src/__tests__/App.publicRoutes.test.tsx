import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { queryClient } from '../lib/queryClient'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('public routes without a session', () => {
  beforeEach(() => {
    clearSession()
  })

  it.each([
    ['/activate', t.account.invalidLink.title],
    ['/reset-password', t.account.invalidLink.title],
    ['/verify-email', t.account.invalidLink.title],
    ['/forgot-password', t.account.forgot.title],
  ])('%s is reachable and does not bounce to /login', (path, heading) => {
    renderAt(path)
    expect(window.location.pathname).toBe(path)
    expect(screen.getByText(heading)).toBeInTheDocument()
  })

  it('/solicitud (loaded on demand) is reachable and does not bounce to /login', async () => {
    renderAt('/solicitud')
    expect(await screen.findByRole('heading', { name: t.solicitud.title })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/solicitud')
  })

  it('still sends private routes to /login', () => {
    renderAt('/recicladores')
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(t.auth.loginButton)).toBeInTheDocument()
  })

  it('offers the forgot-password link on the login screen', () => {
    renderAt('/login')
    expect(screen.getByText(t.auth.forgotLink)).toBeInTheDocument()
  })
})
