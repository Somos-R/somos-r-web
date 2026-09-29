import { apiClient, type RequestOptions } from '../lib/apiClient'
import { clearSession, getSessionUserId, setTokens, type SessionTokens } from '../lib/session'
import { t } from '../lib/i18n'
import { getErrorCode, translateErrorCode } from '../lib/apiError'
import { ROLE_USER_TYPE, isStaffRole } from '../lib/permissions'
import type { AuthUser } from '../types/auth.types'

interface BackendTokenResponse extends SessionTokens {
  token_type: string
  expires_in: number
}

interface BackendUserResponse {
  id: string
  email: string
  full_name: string
  phone: string | null
  id_type: string
  id_number: string
  user_type_code: string
  role_code: string | null
  is_active?: boolean
  created_at: string
  email_verified_at?: string | null
}

export function mapToAuthUser(data: BackendUserResponse): AuthUser {
  const roleCode = data.role_code
  // Same rule as the backend: a role only counts for the actor type it belongs to.
  const role = isStaffRole(roleCode) && ROLE_USER_TYPE[roleCode] === data.user_type_code ? roleCode : null
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    phone: data.phone,
    user_type: data.user_type_code,
    role,
    is_active: data.is_active ?? true,
    email_verified_at: data.email_verified_at ?? null,
    created_at: data.created_at,
  }
}

/** Maps a failed auth request to a message that is safe to show, without leaking backend detail. */
export function getAuthErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response
  if (!response) return t.auth.errors.network
  // A stable code beats the status: `account_disabled` arrives as 401 or 403, and each code has its own wording.
  const translated = response.status === 401 || response.status === 403 ? translateErrorCode(getErrorCode(error)) : undefined
  if (translated) return translated
  switch (response.status) {
    case 401:
      return t.auth.errors.invalidCredentials
    case 403:
      // Backend already words these in Spanish for the user (pending verification, disabled account).
      return typeof response.data?.detail === 'string' ? response.data.detail : t.auth.errors.forbidden
    case 429:
      return t.auth.errors.tooManyAttempts
    default:
      return t.auth.errors.generic
  }
}

export const authService = {
  async login(email: string, password: string): Promise<void> {
    const { data } = await apiClient.post<BackendTokenResponse>(
      '/auth/login',
      { email, password },
      { skipAuthRefresh: true },
    )
    setTokens(data)
  },

  async me(options?: RequestOptions): Promise<AuthUser> {
    const userId = getSessionUserId()
    if (!userId) throw new Error('No active session')
    const { data } = await apiClient.get<BackendUserResponse>(`/users/${userId}`, { signal: options?.signal })
    return mapToAuthUser(data)
  },

  async logout(): Promise<void> {
    try {
      // Revokes the access token and this device's refresh session server-side. Deliberately
      // NOT skipAuthRefresh: if the access token already expired, refresh first so the
      // 30-day refresh token is revoked too instead of staying valid after "logout".
      await apiClient.post('/auth/logout')
    } catch {
      // Expired token or network error: proceed with local cleanup anyway.
    }
    clearSession()
  },

  // Public token flows: the links in the emails work without a session, and a 401 here has
  // nothing to do with an expired access token, so never try to refresh.
  async activate(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/activate', { token, password }, { skipAuthRefresh: true })
  },

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token }, { skipAuthRefresh: true })
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email }, { skipAuthRefresh: true })
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password }, { skipAuthRefresh: true })
  },

  /** Every session is revoked on success, including this one: the caller must end it locally. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
  },

  async resendVerification(): Promise<void> {
    await apiClient.post('/auth/resend-verification')
  },
}
