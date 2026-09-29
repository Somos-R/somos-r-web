import { apiClient, type RequestOptions } from '../lib/apiClient'

export type WeighingStatus = 'pending_validation' | 'validated' | 'rejected' | 'paid'

export interface WeighingMaterial {
  code: string
  label: string
  unit: string
}

export interface WeighingWarehouse {
  id: string
  name: string
  address: string | null
}

export interface WeighingRecycler {
  id: string
  full_name: string
  id_number: string
}

export interface WeighingAPI {
  id: string
  recycler_id: string
  recycler: WeighingRecycler
  material_code: string
  material: WeighingMaterial
  warehouse_id: string
  warehouse: WeighingWarehouse
  kg: number
  price_per_kg: number
  status: WeighingStatus
  rejection_reason: string | null
  validated_by: string | null
  validated_at: string | null
  occurred_at: string
  created_at: string
  total_value: number
}

export interface WeighingListResponse {
  total: number
  items: WeighingAPI[]
}

export interface WeighingStats {
  total_weighings_month: number
  total_kg_month: number
  pending_count: number
  by_material: Array<{ material: string; kg: number }>
}

export interface CreateWeighingPayload {
  recycler_id: string
  material_code: string
  warehouse_id: string
  kg: number
  price_per_kg: number
}

export type WeighingStatusTransition = 'validated' | 'rejected' | 'paid'

export interface UpdateWeighingStatusPayload {
  status: WeighingStatusTransition
  rejection_reason?: string
}

export const weighingsService = {
  list: (params: {
    recycler_id?: string
    material_code?: string
    warehouse_id?: string
    status?: WeighingStatus
    limit?: number
    offset?: number
  } = {}, options?: RequestOptions): Promise<WeighingListResponse> =>
    apiClient.get('/weighings', { params: { limit: 50, ...params }, signal: options?.signal }).then((r) => r.data),

  stats: (options?: RequestOptions): Promise<WeighingStats> =>
    apiClient.get('/weighings/stats', { signal: options?.signal }).then((r) => r.data),

  getById: (id: string, options?: RequestOptions): Promise<WeighingAPI> =>
    apiClient.get(`/weighings/${id}`, { signal: options?.signal }).then((r) => r.data),

  create: (payload: CreateWeighingPayload): Promise<WeighingAPI> =>
    apiClient.post('/weighings', payload).then((r) => r.data),

  updateStatus: (id: string, payload: UpdateWeighingStatusPayload): Promise<WeighingAPI> =>
    apiClient.patch(`/weighings/${id}/status`, payload).then((r) => r.data),
}
