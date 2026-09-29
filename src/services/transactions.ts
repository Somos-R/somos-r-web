import { apiClient, type RequestOptions } from '../lib/apiClient'

export type TransactionType = 'purchase' | 'sale'
export type TransactionStatus = 'pending' | 'paid' | 'cancelled' | 'delivered'

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
  price_per_kg: number
  total_value: number
  recycler_id: string | null
  recycler: TransactionRecycler | null
  weighing_id: string | null
  buyer_name: string | null
  buyer_nit: string | null
  buyer_email: string | null
  occurred_at: string
  created_at: string
  material: TransactionMaterial
  warehouse: TransactionWarehouse
}

export interface TransactionListResponse {
  total: number
  items: TransactionAPI[]
}

export interface TransactionStats {
  total_purchases_month: number
  total_sales_month: number
  total_kg_purchases: number
  total_kg_sales: number
  total_value_purchases: number
  total_value_sales: number
  pending_count: number
}

export interface CreateSalePayload {
  material_code: string
  warehouse_id: string
  kg: number
  price_per_kg: number
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
  } = {}, options?: RequestOptions): Promise<TransactionListResponse> =>
    apiClient.get('/transactions', { params: { limit: 50, ...params }, signal: options?.signal }).then((r) => r.data),

  stats: (options?: RequestOptions): Promise<TransactionStats> =>
    apiClient.get('/transactions/stats', { signal: options?.signal }).then((r) => r.data),

  getById: (id: string, options?: RequestOptions): Promise<TransactionAPI> =>
    apiClient.get(`/transactions/${id}`, { signal: options?.signal }).then((r) => r.data),

  createSale: (payload: CreateSalePayload): Promise<TransactionAPI> =>
    apiClient.post('/transactions', payload).then((r) => r.data),

  updateStatus: (id: string, status: TransactionStatus): Promise<TransactionAPI> =>
    apiClient.patch(`/transactions/${id}/status`, { status }).then((r) => r.data),
}
