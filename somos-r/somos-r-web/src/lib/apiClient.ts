import axios from 'axios'

// ──────────────────────────────────────────────
// Instancia Axios configurada para el backend Somos R
// Base URL: VITE_API_URL (env) o fallback a localhost:8000
//
// Para usar cuando Oscar agregue CORS:
//   import { apiClient } from '@/lib/apiClient'
//   const { data } = await apiClient.get('/api/v1/users?user_type=recycler')
// ──────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

// ── Request interceptor: adjunta Bearer token ──
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor: maneja 401 automáticamente ──
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — limpiar sesión sin importar store
      // (evita dependencia circular; el componente puede escuchar el evento)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.dispatchEvent(new Event('auth:logout'))
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// ──────────────────────────────────────────────
// Endpoints tipados — completar cuando el backend esté listo
// ──────────────────────────────────────────────

export const authApi = {
  /** POST /auth/login — { email, password } → { access_token, token_type } */
  login: (email: string, password: string) =>
    apiClient.post<{ access_token: string; token_type: string }>('/auth/login', { email, password }),

  /** GET /auth/me — requiere CORS + endpoint en backend */
  me: () => apiClient.get('/auth/me'),

  /** POST /auth/logout */
  logout: () => apiClient.post('/auth/logout'),
}

export const recicladoresApi = {
  /** GET /users?user_type_code=recycler */
  list: () => apiClient.get('/users', { params: { user_type_code: 'recycler' } }),

  /** PATCH /users/{id} — verificar/rechazar reciclador */
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/users/${id}`, data),
}

export const pesajesApi = {
  /** GET /pesajes — pendiente de implementación por Oscar */
  list: () => apiClient.get('/pesajes'),

  /** POST /pesajes — pendiente de implementación por Oscar */
  create: (data: unknown) => apiClient.post('/pesajes', data),

  /** PATCH /pesajes/{id}/estado — pendiente de implementación por Oscar */
  updateEstado: (id: string, estado: string) =>
    apiClient.patch(`/pesajes/${id}/estado`, { estado }),
}

export const usersApi = {
  /** GET /users/{id} */
  get: (id: string) => apiClient.get(`/users/${id}`),

  /** PATCH /users/{id} */
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/users/${id}`, data),
}

export const catalogsApi = {
  /** GET /catalogs/document-types */
  documentTypes: () => apiClient.get('/catalogs/document-types'),
}
