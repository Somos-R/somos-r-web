import { apiClient } from '../lib/apiClient'

export type TransactionType = 'compra' | 'venta'
export type TransactionStatus = 'pendiente' | 'pagado' | 'cancelado' | 'entregado'

export interface TransactionMaterial {
  code: string
  label: string
  unit: string
}

export interface TransactionWarehouse {
  id: string
  name: string
  address: string | null
}

export interface TransactionRecycler {
  id: string
  full_name: string
  id_number: string
}

export interface TransactionAPI {
  id: string
  type: TransactionType
  status: TransactionStatus
  material_code: string
  warehouse_id: string
  kg: number
  precio_kg: number
  total_value: number
  recycler_id: string | null
  recycler: TransactionRecycler | null
  weighing_id: string | null
  buyer_name: string | null
  buyer_nit: string | null
  buyer_email: string | null
  fecha: string
  created_at: string
  material: TransactionMaterial
  warehouse: TransactionWarehouse
}

export interface TransactionListResponse {
  total: number
  items: TransactionAPI[]
}

export interface TransactionStats {
  total_compras_month: number
  total_ventas_month: number
  total_kg_compras: number
  total_kg_ventas: number
  total_value_compras: number
  total_value_ventas: number
  pending_count: number
}

export interface CreateVentaPayload {
  material_code: string
  warehouse_id: string
  kg: number
  precio_kg: number
  buyer_name?: string
  buyer_nit?: string
  buyer_email?: string
}

export const transactionsService = {
  list: (params: {
    type?: TransactionType
    status?: TransactionStatus
    material_code?: string
    limit?: number
    offset?: number
  } = {}): Promise<TransactionListResponse> =>
    apiClient.get('/transactions', { params: { limit: 50, ...params } }).then((r) => r.data),

  stats: (): Promise<TransactionStats> =>
    apiClient.get('/transactions/stats').then((r) => r.data),

  getById: (id: string): Promise<TransactionAPI> =>
    apiClient.get(`/transactions/${id}`).then((r) => r.data),

  createVenta: (payload: CreateVentaPayload): Promise<TransactionAPI> =>
    apiClient.post('/transactions', payload).then((r) => r.data),

  updateStatus: (id: string, status: TransactionStatus): Promise<TransactionAPI> =>
    apiClient.patch(`/transactions/${id}/status`, { status }).then((r) => r.data),
}
