import { apiClient } from '../lib/apiClient'
import { clearSession, getSessionUserId, setTokens, type SessionTokens } from '../lib/session'
import { t } from '../lib/i18n'
import type { AuthUser, UserRole } from '../types/auth.types'

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
  created_at: string
}

const ROLE_MAP: Record<string, UserRole> = {
  eca_admin:         'admin_eca',
  eca_operator:      'operador_eca',
  association_admin: 'admin_asociacion',
  superadmin:        'superadmin',
  recycler:          'recycler',
  citizen:           'citizen',
  eca:               'operador_eca',
  association:       'admin_asociacion',
}

export function mapToAuthUser(data: BackendUserResponse): AuthUser {
  const raw = data.role_code ?? data.user_type_code ?? ''
  const role = (ROLE_MAP[raw] ?? 'citizen') as UserRole
  const base = {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    status: 'active' as const,
    created_at: data.created_at,
  }
  if (role === 'operador_eca' || role === 'admin_eca') {
    return { ...base, role, eca_id: '', employee_code: '' }
  }
  if (role === 'admin_asociacion') {
    return { ...base, role, asociacion_id: '' }
  }
  if (role === 'superadmin') {
    return { ...base, role }
  }
  if (role === 'recycler') {
    return {
      ...base,
      role,
      phone: data.phone ?? '',
      cedula: data.id_number,
      association_id: '',
      vehicle_type: 'bike' as const,
    }
  }
  return { ...base, role: 'citizen', phone: data.phone ?? '', address: '', lat: 0, lng: 0 }
}

/** Maps a failed auth request to a message that is safe to show, without leaking backend detail. */
export function getAuthErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response
  if (!response) return t.auth.errors.network
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

  async me(): Promise<AuthUser> {
    const userId = getSessionUserId()
    if (!userId) throw new Error('No active session')
    const { data } = await apiClient.get<BackendUserResponse>(`/users/${userId}`)
    return mapToAuthUser(data)
  },

  async logout(): Promise<void> {
    try {
      // Revokes the token family server-side. skipAuthRefresh: if the token already expired,
      // there is nothing left to revoke, so don't burn a refresh just to log out.
      await apiClient.post('/auth/logout', undefined, { skipAuthRefresh: true })
    } catch {
      // Expired token or network error: proceed with local cleanup anyway.
    }
    clearSession()
  },
}
