import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { weighingsService, type AffiliationStatus, type WeighingStatus } from '../services/weighings'
import { queryKeys, type WeighingsListKey } from './keys'
import { MIN_SEARCH_LENGTH } from './recyclers'

export const weighingsQueries = {
  /** One filtered page; the previous page stays on screen while the next one loads. */
  list: (filters: WeighingsListKey) =>
    queryOptions({
      queryKey: queryKeys.weighings.list(filters),
      queryFn: ({ signal }) =>
        weighingsService.list(
          {
            status: (filters.status || undefined) as WeighingStatus | undefined,
            material_code: filters.materialCode || undefined,
            affiliation: (filters.affiliation || undefined) as AffiliationStatus | undefined,
            q: filters.search.trim().length >= MIN_SEARCH_LENGTH ? filters.search.trim() : undefined,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        ),
      placeholderData: keepPreviousData,
    }),

  stats: () =>
    queryOptions({
      queryKey: queryKeys.weighings.stats,
      queryFn: ({ signal }) => weighingsService.stats({ signal }),
    }),

  /** The latest few, for the dashboard. */
  recent: () =>
    queryOptions({
      queryKey: queryKeys.weighings.recent,
      queryFn: ({ signal }) => weighingsService.list({ limit: 5 }, { signal }),
    }),
}
