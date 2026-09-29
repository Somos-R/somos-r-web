import { useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services/auth'
import { clearSession, getAccessToken, subscribe } from '../lib/session'

export const ME_QUERY_KEY = ['me'] as const
const ME_STALE_TIME = 5 * 60_000

const useHasSession = () => useSyncExternalStore(subscribe, () => getAccessToken() !== null)

/**
 * Session (tokens) lives in lib/session; the user profile is server data, so it lives in
 * React Query under ['me']. Components read both through this hook.
 */
export function useAuth() {
  const queryClient = useQueryClient()
  const isAuthenticated = useHasSession()

  const me = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authService.me,
    enabled: isAuthenticated,
    staleTime: ME_STALE_TIME,
  })

  const login = async (email: string, password: string) => {
    await authService.login(email, password)
    try {
      await queryClient.fetchQuery({ queryKey: ME_QUERY_KEY, queryFn: authService.me, staleTime: ME_STALE_TIME })
    } catch (error) {
      // Tokens without a profile are unusable: don't leave a half-open session behind.
      clearSession()
      throw error
    }
  }

  return {
    user: isAuthenticated ? (me.data ?? null) : null,
    isAuthenticated,
    isUserLoading: isAuthenticated && me.isPending,
    userError: isAuthenticated && me.isError,
    retryUser: () => me.refetch(),
    login,
    logout: authService.logout,
  }
}
