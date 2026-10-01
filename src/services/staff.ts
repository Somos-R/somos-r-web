import { apiClient, type RequestOptions } from '../lib/apiClient'

/** One person of the signed-in organization's staff (ECA or Association). */
export interface StaffMember {
  id: string
  full_name: string
  email: string
  id_type: string
  id_number: string
  phone: string | null
  role_code: string | null
  is_active?: boolean
  /** True from the invitation until the person chooses a password. */
  pending_activation: boolean
  created_at: string
}

export interface StaffListResponse {
  total: number
  limit: number
  offset: number
  items: StaffMember[]
}

export interface StaffListParams {
  /** The organization's own kind of staff: the server only returns people of the caller's organization. */
  user_type_code: 'eca' | 'association'
  q?: string
  limit?: number
  offset?: number
}

export interface InviteStaffPayload {
  email: string
  full_name: string
  id_type: string
  id_number: string
  phone: string | null
  role_code: string
}

export const staffService = {
  list: (params: StaffListParams, options?: RequestOptions): Promise<StaffListResponse> =>
    apiClient.get('/users', { params, signal: options?.signal }).then((r) => r.data),

  /** Creates the account without a password and emails the person a one-time activation link. */
  invite: (payload: InviteStaffPayload): Promise<StaffMember> =>
    apiClient.post('/users/invitations', payload).then((r) => r.data),

  /**
   * Deactivates or reactivates a person of the caller's own organization. Deactivating ends their
   * sessions; repeating the same state is harmless. `reason` is up to 200 characters.
   */
  setActive: (userId: string, payload: { is_active: boolean; reason?: string }): Promise<StaffMember> =>
    apiClient.patch(`/users/${userId}/status`, payload).then((r) => r.data),

  /** A new link for someone who has not activated yet (the previous one stops working). */
  resendInvitation: (userId: string): Promise<StaffMember> =>
    apiClient.post(`/users/${userId}/invitation/resend`).then((r) => r.data),
}
