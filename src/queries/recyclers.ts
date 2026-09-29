import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { recyclersService } from '../services/recyclers'
import { queryKeys, type RecyclersListKey } from './keys'

export const recyclersQueries = {
  /** `status: 'all'` (or empty) means no status filter. */
  list: (filters: RecyclersListKey) =>
    queryOptions({
      queryKey: queryKeys.recyclers.list(filters),
      queryFn: ({ signal }) => {
        const status = filters.status === 'all' || filters.status === '' ? undefined : (filters.status as 'pending' | 'verified' | 'rejected')
        return recyclersService.list(
          { verification_status: status, limit: filters.rowsPerPage, offset: filters.page * filters.rowsPerPage },
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

  /** Verified recyclers, for the weighing form's picker. */
  verified: () =>
    queryOptions({
      queryKey: queryKeys.recyclers.verified,
      queryFn: ({ signal }) => recyclersService.list({ verification_status: 'verified' }, { signal }),
    }),
}
