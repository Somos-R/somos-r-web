import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

vi.mock('../../main', () => ({
  queryClient: { clear: vi.fn() },
}))

// JWT with payload {"sub":"user-uuid-123","user_type":"admin_eca"}
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQtMTIzIiwidXNlcl90eXBlIjoiYWRtaW5fZWNhIn0.fakesig'

vi.mock('../../lib/apiClient', () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQtMTIzIiwidXNlcl90eXBlIjoiYWRtaW5fZWNhIn0.fakesig'
  return {
    apiClient: {
      post: vi.fn().mockResolvedValue({ data: { access_token: token, token_type: 'bearer' } }),
      get: vi.fn().mockResolvedValue({
        data: {
          id: 'user-uuid-123',
          email: 'test@eca.com',
          full_name: 'Test User',
          phone: null,
          id_type: 'CC',
          id_number: '123456',
          user_type_code: 'eca_staff',
          role_code: 'admin_eca',
          created_at: '2024-01-01T00:00:00Z',
        },
      }),
    },
  }
})

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

import { useAuthStore } from '../useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    localStorageMock.clear()
    act(() => {
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
    })
  })

  it('initial state: user is null and token is null', () => {
    const { result } = renderHook(() => useAuthStore())
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
  })

  it('isAuthenticated is false in initial state', () => {
    const { result } = renderHook(() => useAuthStore())
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('login() sets user and token correctly', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password')
    })
    expect(result.current.user).not.toBeNull()
    expect(result.current.token).toBe(MOCK_TOKEN)
  })

  it('login() saves token in localStorage', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password')
    })
    expect(localStorageMock.getItem('auth_token')).toBe(MOCK_TOKEN)
  })

  it('logout() clears user and token', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password')
    })
    act(() => {
      result.current.logout()
    })
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
  })

  it('logout() removes token from localStorage', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password')
    })
    act(() => {
      result.current.logout()
    })
    expect(localStorageMock.getItem('auth_token')).toBeNull()
  })

  it('isAuthenticated is true after successful login()', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password')
    })
    expect(result.current.isAuthenticated).toBe(true)
  })
})
