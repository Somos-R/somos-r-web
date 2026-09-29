import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAuth } from '../useAuth'
import { queryClient } from '../../lib/queryClient'
import { apiClient } from '../../lib/apiClient'
import { clearSession, getAccessToken, setTokens } from '../../lib/session'
import { fakeJwt, mockAdapter } from '../../test/helpers'

const ACCESS = fakeJwt({ sub: 'user-123' })
const TOKENS = { access_token: ACCESS, refresh_token: 'r1', token_type: 'bearer', expires_in: 900 }
const profile = {
  id: 'user-123', email: 'a@b.co', full_name: 'Ana', phone: null, id_type: 'CC', id_number: '1',
  user_type_code: 'eca_staff', role_code: 'eca_admin', created_at: '2024-01-01T00:00:00Z',
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useAuth', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    apiClient.defaults.adapter = mockAdapter((c) =>
      c.url === '/auth/login' ? { data: TOKENS } : c.url === '/auth/logout' ? { data: {} } : { data: profile },
    )
  })

  it('starts unauthenticated with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isUserLoading).toBe(false)
  })

  it('login authenticates and exposes the profile from the server', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login('a@b.co', 'secret')
    })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.role).toBe('admin_eca')
  })

  it('loads the profile on startup when a session already exists', async () => {
    setTokens({ access_token: ACCESS, refresh_token: 'r1' })
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isUserLoading).toBe(true)
    await waitFor(() => expect(result.current.user?.full_name).toBe('Ana'))
  })

  it('ignores a role edited in localStorage: the role comes from the server', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ role: 'superadmin' }))
    setTokens({ access_token: ACCESS, refresh_token: 'r1' })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    expect(result.current.user?.role).toBe('admin_eca')
  })

  it('does not leave a session behind when the profile cannot be loaded after login', async () => {
    apiClient.defaults.adapter = mockAdapter((c) => (c.url === '/auth/login' ? { data: TOKENS } : { status: 403 }))
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await expect(result.current.login('a@b.co', 'secret')).rejects.toBeTruthy()
    })
    expect(getAccessToken()).toBeNull()
  })

  it('logout ends the session and wipes cached server data', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login('a@b.co', 'secret')
    })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(queryClient.getQueryData(['me'])).toBeUndefined()
  })
})
