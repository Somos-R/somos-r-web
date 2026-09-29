import { apiClient } from '../lib/apiClient'

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

export interface UpdateInventoryPayload {
  stock_min_kg?: number
  price_per_kg?: number
}

export const inventoryService = {
  list: (params: { limit?: number; offset?: number } = {}): Promise<InventoryListResponse> =>
    apiClient.get('/inventory', { params: { limit: 100, ...params } }).then((r) => r.data),

  stats: (): Promise<InventoryStats> =>
    apiClient.get('/inventory/stats').then((r) => r.data),

  getById: (id: string): Promise<InventoryItemAPI> =>
    apiClient.get(`/inventory/${id}`).then((r) => r.data),

  update: (id: string, payload: UpdateInventoryPayload): Promise<InventoryItemAPI> =>
    apiClient.patch(`/inventory/${id}`, payload).then((r) => r.data),

  materials: (): Promise<MaterialInfo[]> =>
    apiClient.get('/inventory/materials').then((r) => r.data),

  warehouses: (): Promise<WarehouseInfo[]> =>
    apiClient.get('/inventory/warehouses').then((r) => r.data),
}
