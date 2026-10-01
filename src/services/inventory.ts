import { apiClient, type RequestOptions } from '../lib/apiClient'
import { unwrapBlobError } from '../lib/download'
import type { SortOrder } from '../lib/sorting'

export type InventoryStatus = 'available' | 'low_stock' | 'out_of_stock'

export interface MaterialInfo {
  code: string
  label: string
  unit: string
}

export interface WarehouseInfo {
  id: string
  name: string
  address: string | null
}

export interface InventoryItemAPI {
  id: string
  material_code: string
  warehouse_id: string
  stock_kg: number
  stock_min_kg: number
  price_per_kg: number
  updated_at: string
  status: InventoryStatus
  total_value: number
  material: MaterialInfo
  warehouse: WarehouseInfo
}

export interface InventoryListResponse {
  total: number
  items: InventoryItemAPI[]
}

export interface InventoryStats {
  total_stock_kg: number
  total_value: number
  available_count: number
  low_stock_count: number
  out_of_stock_count: number
}

export type InventorySortColumn =
  | 'material' | 'warehouse' | 'stock_kg' | 'price_per_kg' | 'total_value' | 'status' | 'updated_at'

/** What narrows and orders the inventory; the list adds a page, the CSV export takes every match. */
export interface InventoryFilters {
  material_code?: string
  warehouse_id?: string
  status?: InventoryStatus
  sort?: InventorySortColumn
  order?: SortOrder
}

export type InventoryListParams = InventoryFilters & {
  limit?: number
  offset?: number
}

export interface UpdateInventoryPayload {
  stock_min_kg?: number
  price_per_kg?: number
}

export const inventoryService = {
  list: (params: InventoryListParams = {}, options?: RequestOptions): Promise<InventoryListResponse> =>
    apiClient.get('/inventory', { params: { limit: 50, ...params }, signal: options?.signal }).then((r) => r.data),

  /** Every inventory row matching the filters (not one page) as a CSV file. */
  exportCsv: (params: InventoryFilters = {}, options?: RequestOptions): Promise<Blob> =>
    apiClient
      .get('/inventory/export.csv', { params, responseType: 'blob', signal: options?.signal })
      .then((r) => r.data as Blob)
      .catch(unwrapBlobError),

  stats: (options?: RequestOptions): Promise<InventoryStats> =>
    apiClient.get('/inventory/stats', { signal: options?.signal }).then((r) => r.data),

  getById: (id: string, options?: RequestOptions): Promise<InventoryItemAPI> =>
    apiClient.get(`/inventory/${id}`, { signal: options?.signal }).then((r) => r.data),

  update: (id: string, payload: UpdateInventoryPayload): Promise<InventoryItemAPI> =>
    apiClient.patch(`/inventory/${id}`, payload).then((r) => r.data),

  materials: (options?: RequestOptions): Promise<MaterialInfo[]> =>
    apiClient.get('/inventory/materials', { signal: options?.signal }).then((r) => r.data),

  warehouses: (options?: RequestOptions): Promise<WarehouseInfo[]> =>
    apiClient.get('/inventory/warehouses', { signal: options?.signal }).then((r) => r.data),
}
