import axios from 'axios'
import { API_URL } from './env'
import { clearSession, getAccessToken, getRefreshToken, setTokens, type SessionTokens } from './session'

// Bare client: it must not go through apiClient's interceptors, or a failing refresh would recurse.
export const refreshClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

const LOCK_NAME = 'somosr-token-refresh'

// The backend rotates refresh tokens and treats reuse of an old one as theft: it revokes the
// whole session family. So only ONE refresh may be in flight per browser, across tabs too.
let inflight: Promise<string> | null = null

async function performRefresh(staleAccessToken: string | null): Promise<string> {
  // Another tab (or an earlier request) may have already rotated the tokens while we waited.
  const current = getAccessToken()
  if (current && current !== staleAccessToken) return current

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearSession()
    throw new Error('No refresh token')
  }

  try {
    const { data } = await refreshClient.post<SessionTokens>('/auth/refresh', { refresh_token: refreshToken })
    setTokens(data)
    return data.access_token
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    // The server rejected the refresh token: the session is over. Network errors and 5xx are
    // transient, so keep the session and let the caller fail this one request.
    if (status !== undefined && status >= 400 && status < 500 && status !== 429) clearSession()
    throw error
  }
}

/**
 * Returns a valid access token, refreshing it if `staleAccessToken` (the one that just got a
 * 401) is still the current one. Concurrent callers share a single request.
 */
export function refreshAccessToken(staleAccessToken: string | null): Promise<string> {
  if (!inflight) {
    const run = () => performRefresh(staleAccessToken)
    const locked = typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(LOCK_NAME, run)
      : run()
    inflight = locked.finally(() => {
      inflight = null
    })
  }
  return inflight
}
