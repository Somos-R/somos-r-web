import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { staffService } from '../services/staff'
import { queryKeys, type StaffListKey } from './keys'
import { MIN_SEARCH_LENGTH } from './recyclers'

export const staffQueries = {
  list: (filters: StaffListKey) =>
    queryOptions({
      queryKey: queryKeys.staff.list(filters),
      queryFn: ({ signal }) => {
        const q = filters.search.trim()
        return staffService.list(
          {
            user_type_code: filters.userType,
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
