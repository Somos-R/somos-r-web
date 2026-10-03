import { queryOptions } from '@tanstack/react-query'
import { applicationsService } from '../services/applications'
import { queryKeys } from './keys'

export const applicationsQueries = {
  /**
   * The applicant's own request. The token is a credential, so it is NOT part of the key (keys show up in
   * devtools and caches) and nothing is kept once the page is left: a second link must never see the first one's data.
   */
  current: (token: string) =>
    queryOptions({
      queryKey: queryKeys.applications.current,
      queryFn: ({ signal }) => applicationsService.current(token, { signal }),
      staleTime: 0,
      gcTime: 0,
      retry: false, // a bad link will not get better
      meta: { silent: true }, // the page renders the failure itself (invalid link vs. other errors)
    }),
}
