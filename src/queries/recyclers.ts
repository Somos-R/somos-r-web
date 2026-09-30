import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { recyclersService } from '../services/recyclers'
import { queryKeys, type RecyclersListKey } from './keys'

/** The server ignores shorter searches, so they are not sent. */
export const MIN_SEARCH_LENGTH = 2

const searchParam = (text: string) => {
  const q = text.trim()
  return q.length >= MIN_SEARCH_LENGTH ? q : undefined
}

export const recyclersQueries = {
  /** `status: 'all'` (or empty) means no status filter. */
  list: (filters: RecyclersListKey) =>
    queryOptions({
      queryKey: queryKeys.recyclers.list(filters),
      queryFn: ({ signal }) => {
        const status = filters.status === 'all' || filters.status === '' ? undefined : (filters.status as 'pending' | 'verified' | 'rejected')
        return recyclersService.list(
          { verification_status: status, q: searchParam(filters.search), limit: filters.rowsPerPage, offset: filters.page * filters.rowsPerPage },
          { signal },
        )
      },
      placeholderData: keepPreviousData,
    }),

  /** How many recyclers have a status, from the server's `total` (no rows shipped). */
  count: (status: 'verified' | 'pending') =>
    queryOptions({
      queryKey: queryKeys.recyclers.count(status),
      queryFn: ({ signal }) => recyclersService.list({ verification_status: status, limit: 1 }, { signal }),
    }),
}
