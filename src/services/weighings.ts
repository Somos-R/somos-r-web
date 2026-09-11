import { apiClient } from '../lib/apiClient'

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
  precio_kg: number
  estado: 'pendiente' | 'validado' | 'pagado' | 'rechazado'
  rejection_reason: string | null
  validated_by: string | null
  validated_at: string | null
  fecha: string
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
  precio_kg: number
}

export type WeighingStatusTransition = 'validado' | 'rechazado' | 'pagado'

export interface UpdateWeighingStatusPayload {
  status: WeighingStatusTransition
  rejection_reason?: string
}

export const weighingsService = {
  list: (params: {
    recycler_id?: string
    material_code?: string
    warehouse_id?: string
    estado?: string
    limit?: number
    offset?: number
  } = {}): Promise<WeighingListResponse> =>
    apiClient.get('/weighings', { params: { limit: 50, ...params } }).then((r) => r.data),

  stats: (): Promise<WeighingStats> =>
    apiClient.get('/weighings/stats').then((r) => r.data),

  getById: (id: string): Promise<WeighingAPI> =>
    apiClient.get(`/weighings/${id}`).then((r) => r.data),

  create: (payload: CreateWeighingPayload): Promise<WeighingAPI> =>
    apiClient.post('/weighings', payload).then((r) => r.data),

  updateStatus: (id: string, payload: UpdateWeighingStatusPayload): Promise<WeighingAPI> =>
    apiClient.patch(`/weighings/${id}/status`, payload).then((r) => r.data),
}
