import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

vi.mock('../../main', () => ({
  queryClient: { clear: vi.fn() },
}))

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
      await result.current.login('test@eca.com', 'password', 'admin_eca')
    })
    expect(result.current.user).not.toBeNull()
    expect(result.current.token).not.toBeNull()
  })

  it('login() saves token in localStorage', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password', 'admin_eca')
    })
    expect(localStorageMock.getItem('auth_token')).not.toBeNull()
  })

  it('logout() clears user and token', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password', 'admin_eca')
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
      await result.current.login('test@eca.com', 'password', 'admin_eca')
    })
    act(() => {
      result.current.logout()
    })
    expect(localStorageMock.getItem('auth_token')).toBeNull()
  })

  it('isAuthenticated is true after successful login()', async () => {
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.login('test@eca.com', 'password', 'admin_eca')
    })
    expect(result.current.isAuthenticated).toBe(true)
  })
})
