import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import SetPasswordPage from '../SetPasswordPage'
import { t } from '../../../lib/i18n'
import { authService } from '../../../services/auth'

vi.mock('../../../services/auth', () => ({
  authService: { activate: vi.fn(), resetPassword: vi.fn() },
}))

const GOOD = 'correcto-2026'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="search">{location.search}</div>
}

function renderPage(mode: 'activate' | 'reset', url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/activate" element={<><SetPasswordPage mode={mode} /><LocationProbe /></>} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/forgot-password" element={<div>forgot page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const fill = async (password: string, confirmation: string) => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(t.account.password.newLabel), password)
  await user.type(screen.getByLabelText(t.account.password.confirmLabel), confirmation)
  await user.click(screen.getByRole('button', { name: t.account.activate.submit }))
  return user
}

describe('SetPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the invalid-link screen when there is no token', () => {
    renderPage('activate', '/activate')
    expect(screen.getByText(t.account.invalidLink.title)).toBeInTheDocument()
    expect(screen.getByText(t.account.invalidLink.requestNewActivate)).toBeInTheDocument()
  })

  it('removes the token from the address bar', async () => {
    renderPage('activate', '/activate?token=secret-token')
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/))
  })

  it('blocks a weak password without calling the server', async () => {
    renderPage('activate', '/activate?token=abc')
    await fill('corta', 'corta')
    expect(await screen.findByText(t.account.password.validation.tooShort)).toBeInTheDocument()
    expect(authService.activate).not.toHaveBeenCalled()
  })

  it('blocks mismatching confirmation', async () => {
    renderPage('activate', '/activate?token=abc')
    await fill(GOOD, GOOD + 'x')
    expect(await screen.findByText(t.account.password.validation.mismatch)).toBeInTheDocument()
    expect(authService.activate).not.toHaveBeenCalled()
  })

  it('activates the account with the token and password, then offers login', async () => {
    vi.mocked(authService.activate).mockResolvedValue(undefined)
    renderPage('activate', '/activate?token=abc')
    const user = await fill(GOOD, GOOD)
    expect(authService.activate).toHaveBeenCalledWith('abc', GOOD)
    expect(await screen.findByText(t.account.activate.success)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: t.account.goToLogin }))
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('switches to the invalid-link screen when the server answers 400', async () => {
    vi.mocked(authService.activate).mockRejectedValue({ response: { status: 400, data: { detail: 'x' } } })
    renderPage('activate', '/activate?token=abc')
    await fill(GOOD, GOOD)
    expect(await screen.findByText(t.account.invalidLink.title)).toBeInTheDocument()
  })

  it('shows the server validation message on a 422 and keeps the form', async () => {
    vi.mocked(authService.activate).mockRejectedValue({
      response: { status: 422, data: { detail: [{ msg: 'Value error, La contraseña es demasiado común' }] } },
    })
    renderPage('activate', '/activate?token=abc')
    await fill(GOOD, GOOD)
    expect(await screen.findByText('La contraseña es demasiado común')).toBeInTheDocument()
    expect(screen.getByLabelText(t.account.password.newLabel)).toBeInTheDocument()
  })

  it('reset mode calls resetPassword and, when the link is invalid, offers a new one', async () => {
    vi.mocked(authService.resetPassword).mockRejectedValue({ response: { status: 400, data: {} } })
    renderPage('reset', '/activate?token=abc')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(t.account.password.newLabel), GOOD)
    await user.type(screen.getByLabelText(t.account.password.confirmLabel), GOOD)
    await user.click(screen.getByRole('button', { name: t.account.reset.submit }))
    expect(authService.resetPassword).toHaveBeenCalledWith('abc', GOOD)
    await user.click(await screen.findByRole('button', { name: t.account.invalidLink.requestNewReset }))
    expect(screen.getByText('forgot page')).toBeInTheDocument()
  })
})
