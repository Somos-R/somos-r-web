import { apiClient, type RequestOptions } from '../lib/apiClient'

export interface DocumentType {
  code: string
  label: string
}

export interface RoleOption {
  code: string
  label: string
  /** Which kind of organization the role belongs to (eca, association...). */
  user_type_code?: string
}

export const catalogsService = {
  documentTypes: (options?: RequestOptions): Promise<DocumentType[]> =>
    apiClient.get('/catalogs/document-types', { signal: options?.signal }).then((r) => r.data),

  /** Every customer role; the caller keeps the ones of their own kind of organization. */
  roles: (options?: RequestOptions): Promise<RoleOption[]> =>
    apiClient.get('/catalogs/roles', { signal: options?.signal }).then((r) => r.data),
}
