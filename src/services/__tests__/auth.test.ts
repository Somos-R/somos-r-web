import { describe, it, expect, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../../lib/apiClient'
import { refreshClient } from '../../lib/tokenRefresh'
import { getAccessToken, getRefreshToken, setTokens } from '../../lib/session'
import { authService, getAuthErrorMessage, mapToAuthUser } from '../auth'
import { t } from '../../lib/i18n'
import { fakeJwt, httpError, mockAdapter } from '../../test/helpers'

const ACCESS = fakeJwt({ sub: 'user-123' })
const backendUser = (over: object = {}) => ({
  id: 'user-123', email: 'a@b.co', full_name: 'Ana', phone: null, id_type: 'CC', id_number: '1',
  user_type_code: 'eca', role_code: 'eca_admin', created_at: '2024-01-01T00:00:00Z', ...over,
})

describe('authService', () => {
  beforeEach(() => localStorage.clear())

  it('login stores access and refresh tokens', async () => {
    apiClient.defaults.adapter = mockAdapter(() => ({
      data: { access_token: ACCESS, refresh_token: 'r1', token_type: 'bearer', expires_in: 900 },
    }))
    await authService.login('a@b.co', 'secret')
    expect(getAccessToken()).toBe(ACCESS)
    expect(getRefreshToken()).toBe('r1')
  })

  it('me reads the profile and capabilities from /auth/me and maps the role', async () => {
    setTokens({ access_token: ACCESS, refresh_token: 'r1' })
    const urls: string[] = []
    apiClient.defaults.adapter = mockAdapter((c) => {
      urls.push(String(c.url))
      return { data: backendUser({ capabilities: ['weighings.view'] }) }
    })
    const user = await authService.me()
    expect(urls).toEqual(['/auth/me'])
    expect(user.role).toBe('eca_admin')
    expect(user.capabilities).toEqual(['weighings.view'])
  })

  it('logout clears the session even if the server call fails', async () => {
    setTokens({ access_token: ACCESS, refresh_token: 'r1' })
    apiClient.defaults.adapter = mockAdapter(() => ({ status: 500 }))
    await authService.logout()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('logout refreshes an expired access token first so the refresh session is revoked too', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'r1' })
    refreshClient.defaults.adapter = mockAdapter(() => ({
      data: { access_token: 'fresh', refresh_token: 'r2' },
    }))
    const logoutAuth: string[] = []
    apiClient.defaults.adapter = mockAdapter((c) => {
      logoutAuth.push(String(c.headers.Authorization))
      return String(c.headers.Authorization) === 'Bearer fresh' ? { data: {} } : { status: 401 }
    })
    await authService.logout()
    expect(logoutAuth).toEqual(['Bearer expired', 'Bearer fresh'])
    expect(getAccessToken()).toBeNull()
  })
})

describe('mapToAuthUser', () => {
  it('gives no role (and so no permissions) to unknown role codes', () => {
    expect(mapToAuthUser(backendUser({ role_code: 'something-new' })).role).toBeNull()
  })
})

describe('getAuthErrorMessage', () => {
  const err = (status: number, data?: unknown) => httpError({ headers: {} } as InternalAxiosRequestConfig, status, data)

  it('maps statuses to safe messages', () => {
    expect(getAuthErrorMessage(err(401))).toBe(t.auth.errors.invalidCredentials)
    expect(getAuthErrorMessage(err(429))).toBe(t.auth.errors.tooManyAttempts)
    expect(getAuthErrorMessage(err(500))).toBe(t.auth.errors.generic)
  })

  it('shows the backend explanation for 403 (pending verification, disabled account)', () => {
    expect(getAuthErrorMessage(err(403, { detail: 'Tu cuenta está pendiente de verificación' })))
      .toBe('Tu cuenta está pendiente de verificación')
    expect(getAuthErrorMessage(err(403, { detail: { nested: true } }))).toBe(t.auth.errors.forbidden)
  })

  it('reports connection problems when there is no response', () => {
    expect(getAuthErrorMessage(new Error('Network Error'))).toBe(t.auth.errors.network)
  })
})
