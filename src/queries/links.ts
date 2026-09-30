import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { linksService, type LinkStatus } from '../services/links'
import { queryKeys, type DirectoryKey, type LinksListKey } from './keys'
import { MIN_SEARCH_LENGTH } from './recyclers'

export const linksQueries = {
  /** The links of the caller's organization; `status: ''` means every state. */
  list: (filters: LinksListKey) =>
    queryOptions({
      queryKey: queryKeys.links.list(filters),
      queryFn: ({ signal }) =>
        linksService.list(
          {
            status: (filters.status || undefined) as LinkStatus | undefined,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        ),
      placeholderData: keepPreviousData,
    }),

  /** Approved associations, each with the state of the caller's link with it. */
  directory: (filters: DirectoryKey) =>
    queryOptions({
      queryKey: queryKeys.links.directory(filters),
      queryFn: ({ signal }) => {
        const q = filters.search.trim()
        return linksService.directory(
          {
            q: q.length >= MIN_SEARCH_LENGTH ? q : undefined,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        )
      },
      placeholderData: keepPreviousData,
    }),
}
