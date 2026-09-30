import { queryOptions } from '@tanstack/react-query'
import { catalogsService } from '../services/catalogs'
import { inventoryService } from '../services/inventory'
import { STALE_TIME } from './config'
import { queryKeys } from './keys'

// Defined once and used by every screen that needs them: the same catalog can't end up with a
// different cache lifetime depending on which screen asked first.
export const catalogQueries = {
  materials: () =>
    queryOptions({
      queryKey: queryKeys.catalogs.materials,
      queryFn: ({ signal }) => inventoryService.materials({ signal }),
      staleTime: STALE_TIME.catalog,
    }),

  warehouses: () =>
    queryOptions({
      queryKey: queryKeys.catalogs.warehouses,
      queryFn: ({ signal }) => inventoryService.warehouses({ signal }),
      staleTime: STALE_TIME.catalog,
    }),

  roles: () =>
    queryOptions({
      queryKey: queryKeys.catalogs.roles,
      queryFn: ({ signal }) => catalogsService.roles({ signal }),
      staleTime: STALE_TIME.catalog,
    }),

  documentTypes: () =>
    queryOptions({
      queryKey: queryKeys.catalogs.documentTypes,
      queryFn: ({ signal }) => catalogsService.documentTypes({ signal }),
      staleTime: STALE_TIME.immutable,
      retry: false, // the form has a built-in fallback list
    }),
}
