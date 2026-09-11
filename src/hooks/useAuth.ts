import { create } from 'zustand'
import { queryClient } from '../main'
import { apiClient } from '../lib/apiClient'
import type { AuthUser, UserRole } from '../types/auth.types'

interface AuthStore {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser | null) => void
}

interface BackendTokenResponse {
  access_token: string
  token_type: string
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

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64))
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

function mapToAuthUser(data: BackendUserResponse): AuthUser {
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

const getInitialState = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('auth_user') || 'null')
    : null
  return { user, token }
}

export const useAuthStore = create<AuthStore>((set) => {
  const { user: initialUser, token: initialToken } = getInitialState()

  return {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,
    isLoading: false,
    error: null,

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null })
      try {
        const { data: tokenData } = await apiClient.post<BackendTokenResponse>('/auth/login', { email, password })
        const { access_token } = tokenData

        const payload = decodeJwtPayload(access_token)
        const userId = payload['sub'] as string

        const { data: userData } = await apiClient.get<BackendUserResponse>(`/users/${userId}`, {
          headers: { Authorization: `Bearer ${access_token}` },
        })

        const user = mapToAuthUser(userData)
        localStorage.setItem('auth_token', access_token)
        localStorage.setItem('auth_user', JSON.stringify(user))
        set({ user, token: access_token, isAuthenticated: true, isLoading: false })
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Login falló',
          isLoading: false,
        })
        throw err
      }
    },

    logout: async () => {
      try {
        await apiClient.post('/auth/logout')
      } catch {
        // Token already expired or network error — proceed with local cleanup
      }
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      queryClient.clear()
      set({ user: null, token: null, isAuthenticated: false, error: null })
    },

    setUser: (user) => set({ user }),
  }
})
