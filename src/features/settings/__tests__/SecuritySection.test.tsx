import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecuritySection from '../SecuritySection'
import { t } from '../../../lib/i18n'
import { authService } from '../../../services/auth'
import { setTokens, getAccessToken } from '../../../lib/session'
import { consumeLoginNotice } from '../../../lib/loginNotice'

vi.mock('../../../services/auth', () => ({
  authService: { changePassword: vi.fn(), resendVerification: vi.fn() },
}))

let mockUser: { email_verified_at: string | null } | null = { email_verified_at: null }
vi.mock('../../../hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }))

const copy = t.account.security

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <SecuritySection />
    </QueryClientProvider>,
  )

describe('SecuritySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    localStorage.clear()
    mockUser = { email_verified_at: null }
  })

  it('offers to resend the confirmation only while the email is unverified', () => {
    renderSection()
    expect(screen.getByText(copy.emailVerification.unverified)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.emailVerification.resend })).toBeInTheDocument()
  })

  it('hides the resend button once the email is verified', () => {
    mockUser = { email_verified_at: '2026-09-01T00:00:00Z' }
    renderSection()
    expect(screen.getByText(copy.emailVerification.verified)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.emailVerification.resend })).not.toBeInTheDocument()
  })

  it('resends the confirmation and reports it', async () => {
    vi.mocked(authService.resendVerification).mockResolvedValue(undefined)
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: copy.emailVerification.resend }))
    expect(await screen.findByText(copy.emailVerification.sent)).toBeInTheDocument()
  })

  it('ends the session locally after a password change and leaves a notice for the login screen', async () => {
    setTokens({ access_token: 'a', refresh_token: 'r' })
    vi.mocked(authService.changePassword).mockResolvedValue(undefined)
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: copy.changePassword.button }))
    await userEvent.type(screen.getByLabelText(new RegExp(copy.changePassword.currentLabel)), 'la-actual-123')
    await userEvent.type(screen.getByLabelText(new RegExp(copy.changePassword.newLabel)), 'nueva-clave-2026')
    await userEvent.click(screen.getByRole('button', { name: copy.changePassword.submit }))

    await waitFor(() => expect(authService.changePassword).toHaveBeenCalledWith('la-actual-123', 'nueva-clave-2026'))
    await waitFor(() => expect(getAccessToken()).toBeNull())
    expect(consumeLoginNotice()).toBe(copy.changePassword.notice)
  })

  it('does not call the server when the new password breaks the policy', async () => {
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: copy.changePassword.button }))
    await userEvent.type(screen.getByLabelText(new RegExp(copy.changePassword.currentLabel)), 'la-actual-123')
    await userEvent.type(screen.getByLabelText(new RegExp(copy.changePassword.newLabel)), 'corta')
    await userEvent.click(screen.getByRole('button', { name: copy.changePassword.submit }))
    expect(await screen.findByText(t.account.password.validation.tooShort)).toBeInTheDocument()
    expect(authService.changePassword).not.toHaveBeenCalled()
  })

  it('keeps the session and shows the server message when the current password is wrong', async () => {
    setTokens({ access_token: 'a', refresh_token: 'r' })
    vi.mocked(authService.changePassword).mockRejectedValue({
      response: { status: 400, data: { detail: 'La contraseña actual es incorrecta' } },
    })
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: copy.changePassword.button }))
    await userEvent.type(screen.getByLabelText(new RegExp(copy.changePassword.currentLabel)), 'equivocada-123')
    await userEvent.type(screen.getByLabelText(new RegExp(copy.changePassword.newLabel)), 'nueva-clave-2026')
    await userEvent.click(screen.getByRole('button', { name: copy.changePassword.submit }))
    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument()
    expect(getAccessToken()).toBe('a')
  })
})
