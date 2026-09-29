import { apiClient, type RequestOptions } from '../lib/apiClient'

export interface DocumentType {
  code: string
  label: string
}

export const catalogsService = {
  documentTypes: (options?: RequestOptions): Promise<DocumentType[]> =>
    apiClient.get('/catalogs/document-types', { signal: options?.signal }).then((r) => r.data),
}
