import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { periodBounds } from '../lib/period'
import type { SortOrder } from '../lib/sorting'
import { transactionsService, type TransactionSortColumn } from '../services/transactions'
import { queryKeys, type TransactionKind, type TransactionsListKey } from './keys'

export const transactionsQueries = {
  list: (kind: TransactionKind, filters: TransactionsListKey) =>
    queryOptions({
      queryKey: queryKeys.transactions.list(kind, filters),
      queryFn: ({ signal }) =>
        transactionsService.list(
          {
            type: kind,
            ...periodBounds(filters.dateFrom, filters.dateTo),
            sort: filters.sort as TransactionSortColumn,
            order: filters.order as SortOrder,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        ),
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
