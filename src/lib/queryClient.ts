import { QueryClient } from '@tanstack/react-query'

const MAX_RETRIES = 2

// Retrying a 4xx (bad request, 401, 403, 404) never helps and only delays the error;
// only network failures and 5xx responses are worth a second attempt.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < MAX_RETRIES
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
    },
  },
})
