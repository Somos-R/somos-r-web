import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VerifyEmailPage from '../VerifyEmailPage'
import ForgotPasswordPage from '../ForgotPasswordPage'
import userEvent from '@testing-library/user-event'
import { t } from '../../../lib/i18n'
import { authService } from '../../../services/auth'

vi.mock('../../../services/auth', () => ({
  authService: { verifyEmail: vi.fn(), forgotPassword: vi.fn() },
}))

const renderVerify = (url: string) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </StrictMode>,
  )

describe('VerifyEmailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the single-use token exactly once, even under StrictMode', async () => {
    vi.mocked(authService.verifyEmail).mockResolvedValue(undefined)
    renderVerify('/verify-email?token=abc')
    expect(await screen.findByText(t.account.verify.successTitle)).toBeInTheDocument()
    expect(authService.verifyEmail).toHaveBeenCalledTimes(1)
    expect(authService.verifyEmail).toHaveBeenCalledWith('abc')
  })

  it('shows the invalid-link screen for a 400', async () => {
    vi.mocked(authService.verifyEmail).mockRejectedValue({ response: { status: 400, data: {} } })
    renderVerify('/verify-email?token=abc')
    expect(await screen.findByText(t.account.invalidLink.title)).toBeInTheDocument()
  })

  it('shows the invalid-link screen without calling the server when there is no token', () => {
    renderVerify('/verify-email')
    expect(screen.getByText(t.account.invalidLink.title)).toBeInTheDocument()
    expect(authService.verifyEmail).not.toHaveBeenCalled()
  })

  it('reports a connection problem instead of calling the link invalid', async () => {
    vi.mocked(authService.verifyEmail).mockRejectedValue(new Error('Network Error'))
    renderVerify('/verify-email?token=abc')
    expect(await screen.findByText(t.errors.network)).toBeInTheDocument()
    expect(screen.queryByText(t.account.invalidLink.title)).not.toBeInTheDocument()
  })
})

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks())

  const renderForgot = () =>
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    )

  it('rejects a malformed email locally', async () => {
    renderForgot()
    await userEvent.type(screen.getByLabelText(t.auth.emailLabel), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: t.account.forgot.submit }))
    expect(await screen.findByText(t.auth.validation.emailInvalid)).toBeInTheDocument()
    expect(authService.forgotPassword).not.toHaveBeenCalled()
  })

  it('always shows the same neutral confirmation once the server answers', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValue(undefined)
    renderForgot()
    await userEvent.type(screen.getByLabelText(t.auth.emailLabel), 'nadie@somosr.com')
    await userEvent.click(screen.getByRole('button', { name: t.account.forgot.submit }))
    expect(await screen.findByText(t.account.forgot.sent)).toBeInTheDocument()
    expect(authService.forgotPassword).toHaveBeenCalledWith('nadie@somosr.com')
  })

  it('tells the user when the request is rate limited', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValue({ response: { status: 429, data: {}, headers: { 'retry-after': '40' } } })
    renderForgot()
    await userEvent.type(screen.getByLabelText(t.auth.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: t.account.forgot.submit }))
    expect(await screen.findByText(/40 segundos/)).toBeInTheDocument()
    expect(screen.queryByText(t.account.forgot.sent)).not.toBeInTheDocument()
  })
})
