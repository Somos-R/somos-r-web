import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { SortOrder } from '../lib/sorting'
import { inventoryService, type InventorySortColumn, type InventoryStatus } from '../services/inventory'
import { queryKeys, type InventoryListKey } from './keys'

export const inventoryQueries = {
  list: (filters: InventoryListKey) =>
    queryOptions({
      queryKey: queryKeys.inventory.list(filters),
      queryFn: ({ signal }) =>
        inventoryService.list(
          {
            status: (filters.status || undefined) as InventoryStatus | undefined,
            material_code: filters.materialCode || undefined,
            warehouse_id: filters.warehouseId || undefined,
            sort: filters.sort as InventorySortColumn,
            order: filters.order as SortOrder,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        ),
      placeholderData: keepPreviousData,
    }),

  stats: () =>
    queryOptions({
      queryKey: queryKeys.inventory.stats,
      queryFn: ({ signal }) => inventoryService.stats({ signal }),
    }),

  /** One filtered row instead of the whole inventory, just to read a reference price. */
  priceSuggestion: (materialCode: string, warehouseId: string) =>
    queryOptions({
      queryKey: queryKeys.inventory.priceSuggestion(materialCode, warehouseId),
      queryFn: ({ signal }) =>
        inventoryService.list({ material_code: materialCode, warehouse_id: warehouseId, limit: 1 }, { signal }),
    }),
}
