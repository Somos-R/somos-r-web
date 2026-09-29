import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { transactionsService } from '../services/transactions'
import { queryKeys, type PageKey, type TransactionKind } from './keys'

export const transactionsQueries = {
  list: (kind: TransactionKind, page: PageKey) =>
    queryOptions({
      queryKey: queryKeys.transactions.list(kind, page),
      queryFn: ({ signal }) =>
        transactionsService.list({ type: kind, limit: page.rowsPerPage, offset: page.page * page.rowsPerPage }, { signal }),
      placeholderData: keepPreviousData,
    }),

  /** How many are pending, counted by the server over ALL rows (`limit: 1` ships no rows, only `total`). */
  pendingCount: (kind: TransactionKind) =>
    queryOptions({
      queryKey: queryKeys.transactions.pendingCount(kind),
      queryFn: ({ signal }) => transactionsService.list({ type: kind, status: 'pending', limit: 1 }, { signal }),
    }),

  stats: () =>
    queryOptions({
      queryKey: queryKeys.transactions.stats,
      queryFn: ({ signal }) => transactionsService.stats({ signal }),
    }),
}
