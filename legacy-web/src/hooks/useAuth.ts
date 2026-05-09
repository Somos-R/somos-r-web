import { create } from 'zustand'
import { queryClient } from '../main'
import type { AuthUser } from '../types/auth.types.ts'

interface AuthStore {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
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

    login: async (email: string, _password: string) => {
      set({ isLoading: true, error: null })
      try {
        // Mock — reemplazar con axios POST /auth/login cuando backend tenga CORS + /auth/me
        const user: AuthUser = {
          id: '1',
          email,
          full_name: 'Admin ECA',
          role: 'admin',
          status: 'active',
          created_at: new Date().toISOString(),
          eca_id: 'ECA-001',
          employee_code: 'EMP-001',
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
