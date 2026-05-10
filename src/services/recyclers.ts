import { apiClient } from '../lib/apiClient'

export interface RecyclerItem {
  id: string
  full_name: string
  id_number: string
  phone: string | null
  verification_status: 'pending' | 'verified' | 'rejected' | null
  created_at: string
}

interface RecyclersListResponse {
  total: number
  limit: number
  offset: number
  items: RecyclerItem[]
}

export interface CreateRecyclerPayload {
  user_type_code: 'recycler'
  full_name: string
  email: string
  id_type: string
  id_number: string
  phone: string | null
}

export interface UpdateStatusPayload {
  status: 'verified' | 'rejected'
  rejection_reason?: string
}

export const recyclersService = {
  list: (): Promise<RecyclersListResponse> =>
    apiClient
      .get('/users', { params: { user_type_code: 'recycler', limit: 100 } })
      .then((r) => r.data),

  create: (payload: CreateRecyclerPayload) =>
    apiClient.post('/auth/register', payload).then((r) => r.data),

  updateStatus: (userId: string, payload: UpdateStatusPayload) =>
    apiClient
      .patch(`/users/${userId}/verification-status`, payload)
      .then((r) => r.data),
}
