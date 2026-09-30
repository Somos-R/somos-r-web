import { apiClient, type RequestOptions } from '../lib/apiClient'

/** A link between an ECA and an Association. The ECA asks; the Association decides. */
export type LinkStatus = 'requested' | 'active' | 'rejected' | 'removed'

/** What one side may know about the other organization: a name and a city, nothing more. */
export interface OrganizationRef {
  id: string
  legal_name: string
  city: string | null
}

export interface DirectoryEntry extends OrganizationRef {
  /** The state of the caller's link with this association, if there is one. */
  link_status: LinkStatus | null
}

export interface DirectoryResponse {
  total: number
  limit: number
  offset: number
  items: DirectoryEntry[]
}

export interface OrganizationLink {
  id: string
  status: LinkStatus
  eca: OrganizationRef
  association: OrganizationRef
  rejection_reason: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

export interface LinkListResponse {
  total: number
  limit: number
  offset: number
  items: OrganizationLink[]
}

export const linksService = {
  /** Approved associations an ECA can ask to link with (`q`: name, no case or accents, 2+ characters). */
  directory: (params: { q?: string; limit?: number; offset?: number }, options?: RequestOptions): Promise<DirectoryResponse> =>
    apiClient.get('/directory/associations', { params, signal: options?.signal }).then((r) => r.data),

  /** The links of the caller's own organization. */
  list: (params: { status?: LinkStatus; limit?: number; offset?: number }, options?: RequestOptions): Promise<LinkListResponse> =>
    apiClient.get('/links', { params, signal: options?.signal }).then((r) => r.data),

  /** ECA only. Reopens a rejected or removed link. */
  request: (associationId: string): Promise<OrganizationLink> =>
    apiClient.post('/links', { association_id: associationId }).then((r) => r.data),

  /** Association only. */
  accept: (linkId: string): Promise<OrganizationLink> =>
    apiClient.post(`/links/${linkId}/accept`).then((r) => r.data),

  /** Association only; the reason (up to 200 characters) is optional. */
  reject: (linkId: string, reason?: string): Promise<OrganizationLink> =>
    apiClient.post(`/links/${linkId}/reject`, reason ? { reason } : {}).then((r) => r.data),

  /** Ends an active link (either side), or cancels the ECA's own pending request. */
  remove: (linkId: string): Promise<OrganizationLink> =>
    apiClient.post(`/links/${linkId}/remove`).then((r) => r.data),
}
