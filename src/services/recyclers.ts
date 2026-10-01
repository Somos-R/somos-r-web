import { apiClient, type RequestOptions } from '../lib/apiClient'

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
  /**
   * The association the recycler belongs to (it is who verifies them). Association staff leave it out: the
   * backend uses their own. Anyone else must send it, or the backend answers 422 `association_required`.
   */
  association_id?: string
}

export interface UpdateStatusPayload {
  status: 'verified' | 'rejected'
  rejection_reason?: string
}

export interface UpdateRecyclerPayload {
  full_name?: string
  phone?: string | null
}

/** What an ECA needs to weigh someone: who they are and how they relate to that ECA. No contact data. */
export interface RecyclerLookup {
  id: string
  full_name: string
  id_type: string
  id_number: string
  is_active: boolean
  verification_status: 'pending' | 'verified' | 'rejected' | null
  association: { id: string; legal_name: string; city: string | null } | null
  /** Relative to the ECA that asks: `linked` only for a verified recycler of an association linked to it. */
  affiliation: 'linked' | 'unlinked_association' | 'independent'
}

export interface RecyclersListParams {
  limit?: number
  offset?: number
  verification_status?: 'pending' | 'verified' | 'rejected'
  /** Contains-search on name, document and email (server side: no case or accents, 2 characters minimum). */
  q?: string
}

export const recyclersService = {
  /**
   * Finds a registered recycler by document, whatever their association (an ECA receives material
   * from anyone). `id_type` is optional; sending it avoids matches between different kinds of
   * document with the same number. Rejects with 404 `recycler_not_found` when there is none.
   */
  lookup: (params: { document: string; id_type?: string }, options?: RequestOptions): Promise<RecyclerLookup> =>
    apiClient.get('/recyclers/lookup', { params, signal: options?.signal }).then((r) => r.data),

  list: (params: RecyclersListParams = {}, options?: RequestOptions): Promise<RecyclersListResponse> =>
    apiClient
      .get('/users', {
        params: { user_type_code: 'recycler', limit: 100, ...params },
        signal: options?.signal,
      })
      .then((r) => r.data),

  getById: (userId: string, options?: RequestOptions): Promise<RecyclerItem> =>
    apiClient.get(`/users/${userId}`, { signal: options?.signal }).then((r) => r.data),

  create: (payload: CreateRecyclerPayload) =>
    apiClient.post('/auth/register', payload).then((r) => r.data),

  updateStatus: (userId: string, payload: UpdateStatusPayload) =>
    apiClient
      .patch(`/users/${userId}/verification-status`, payload)
      .then((r) => r.data),

  update: (userId: string, payload: UpdateRecyclerPayload) =>
    apiClient.patch(`/users/${userId}`, payload).then((r) => r.data),
}
