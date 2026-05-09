import { create } from 'zustand'
import { queryClient } from '../main'
import type { AuthUser, UserRole } from '../types/auth.types'

interface AuthStore {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string, role?: UserRole) => Promise<void>
  logout: () => void
  setUser: (user: AuthUser | null) => void
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

    login: async (email: string, _password: string, role: UserRole = 'admin_eca') => {
      set({ isLoading: true, error: null })
      try {
        // Mock — reemplazar con axios POST /auth/login cuando backend tenga CORS
        const baseUser = {
          id: '1',
          email,
          full_name: role === 'admin_asociacion' ? 'Admin Asociación' : 'Admin ECA',
          status: 'active' as const,
          created_at: new Date().toISOString(),
        }

        let user: AuthUser
        if (role === 'operador_eca' || role === 'admin_eca') {
          user = { ...baseUser, role, eca_id: 'ECA-001', employee_code: 'EMP-001' }
        } else if (role === 'admin_asociacion') {
          user = { ...baseUser, role, asociacion_id: 'ASO-001' }
        } else if (role === 'superadmin') {
          user = { ...baseUser, role }
        } else {
          user = { ...baseUser, role: 'admin_eca', eca_id: 'ECA-001', employee_code: 'EMP-001' }
        }

        const token = 'mock_token_' + Date.now()
        localStorage.setItem('auth_token', token)
        localStorage.setItem('auth_user', JSON.stringify(user))
        set({ user, token, isAuthenticated: true, isLoading: false })
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Login falló',
          isLoading: false,
        })
        throw err
      }
    },

    logout: () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      queryClient.clear()
      set({ user: null, token: null, isAuthenticated: false, error: null })
    },

    setUser: (user) => set({ user }),
  }
})
