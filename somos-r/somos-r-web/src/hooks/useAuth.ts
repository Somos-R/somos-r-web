import { create } from 'zustand'
import { queryClient } from '../main'
import type { AuthUser, PortalUser, PortalRole } from '../types/auth.types.ts'

interface AuthStore {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string, mockRoles?: string[]) => Promise<void>
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

    login: async (email: string, _password: string, mockRoles?: string[]) => {
      set({ isLoading: true, error: null })
      try {
        // Mock — simula un usuario con ambos roles para desarrollo local.
        // Cambiar roles a ['operador_eca'] o ['admin_asociacion'] para probar vistas específicas.
        // Reemplazar con: const { data } = await authApi.login(email, password)
        //                 y decodificar JWT o llamar authApi.me() para obtener roles reales.
        const user: PortalUser = {
          id: '1',
          email,
          full_name: 'Admin ECA',
          role: 'admin_eca',
          roles: (mockRoles ?? ['operador_eca', 'admin_eca', 'admin_asociacion']) as PortalRole[],
          status: 'active',
          created_at: new Date().toISOString(),
          eca_id: 'ECA-001',
          asociacion_id: 'ASOC-001',
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
