import { apiClient } from '../lib/apiClient'

export interface RecyclerItem {
  id: string
  full_name: string
  email: string
  id_type: string
  id_number: string
  phone: string | null
  verification_status: 'pending' | 'verified' | 'rejected' | null
  rejection_reason: string | null
  verified_at: string | null
  profile_picture: string | null
  id_picture: string | null
  created_at: string
  updated_at: string
}

export interface RecyclersListResponse {
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

export interface UpdateRecyclerPayload {
  full_name?: string
  phone?: string | null
}

export interface RecyclersListParams {
  limit?: number
  offset?: number
  verification_status?: 'pending' | 'verified' | 'rejected'
}

export const recyclersService = {
  list: (params: RecyclersListParams = {}): Promise<RecyclersListResponse> =>
    apiClient
      .get('/users', {
        params: { user_type_code: 'recycler', limit: 100, ...params },
      })
      .then((r) => r.data),

  getById: (userId: string): Promise<RecyclerItem> =>
    apiClient.get(`/users/${userId}`).then((r) => r.data),

  create: (payload: CreateRecyclerPayload) =>
    apiClient.post('/auth/register', payload).then((r) => r.data),

  updateStatus: (userId: string, payload: UpdateStatusPayload) =>
    apiClient
      .patch(`/users/${userId}/verification-status`, payload)
      .then((r) => r.data),

  update: (userId: string, payload: UpdateRecyclerPayload) =>
    apiClient.patch(`/users/${userId}`, payload).then((r) => r.data),
}
