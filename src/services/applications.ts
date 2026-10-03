import { apiClient, type RequestOptions } from '../lib/apiClient'

export type OrganizationKind = 'association' | 'eca'

/** Where an application is: only `draft` and `changes_requested` can be edited and sent. */
export type ApplicationStatus =
  | 'draft' | 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'rejected' | 'suspended'

/** The data of the organization the applicant fills in, plus the applicant's own name. */
export type ApplicationField =
  | 'legal_name' | 'tax_id' | 'legal_representative' | 'contact_email' | 'contact_phone' | 'address' | 'city'
  | 'applicant_name' | 'applicant_id_type' | 'applicant_id_number' | 'applicant_phone'

/** What the applicant sees of their own request (`GET /applications/current`). */
export interface ApplicationView {
  id: string
  type: OrganizationKind
  status: ApplicationStatus
  legal_name: string
  tax_id: string | null
  legal_representative: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  city: string | null
  applicant_name: string
  applicant_email: string
  /** The applicant becomes the first administrator, whose account needs a document and a phone. */
  applicant_id_type: string | null
  applicant_id_number: string | null
  applicant_phone: string | null
  consent_at: string
  submitted_at: string | null
  submission_count: number
  submissions_left: number
  /** Draft or changes requested. */
  can_edit: boolean
  /** Editable, nothing missing and sends left. */
  can_submit: boolean
  /** What is still empty and required to send (field names). */
  missing_fields: string[]
  /** Why the reviewer asked for corrections; only while `status` is `changes_requested`, null after resending. */
  feedback: ApplicationFeedback | null
}

/** A document the reviewer sent back, and why. */
export interface FeedbackDocument {
  code: string
  label: string
  status: 'missing' | 'not_compliant'
  comment: string | null
}

export interface ApplicationFeedback {
  /** Written by the reviewer: plain text, never HTML. Can be empty when they only marked documents. */
  summary: string | null
  created_at: string
  /** Which send it answers. */
  submission_number: number
  /** The documents sent back, each with its reason. */
  documents: FeedbackDocument[]
}

export interface StartApplicationPayload {
  type: OrganizationKind
  legal_name: string
  applicant_name: string
  applicant_email: string
  /** NIT; can be completed later. */
  tax_id?: string
  /** The applicant accepted the data treatment; the backend refuses `false`. */
  consent: true
}

/** Only the fields that changed; `null` empties an optional field. */
export type UpdateApplicationPayload = Partial<Record<ApplicationField, string | null>>

/** The reviewer's verdict on a document; `pending` until they look at it (and again after a new upload). */
export type DocumentStatus = 'pending' | 'ok' | 'missing' | 'not_compliant'

/** A document Somos R asks the organization for. The list comes from the server: it is a catalog Somos R edits. */
export interface DocumentType {
  code: string
  label: string
  is_required: boolean
}

/** A file the applicant attached. The server never says where it is stored and does not let it be downloaded. */
export interface UploadedDocument {
  id: string
  original_name: string
  content_type: string
  size_bytes: number
  uploaded_at: string
  status: DocumentStatus
  review_comment: string | null
}

/** One document that is asked for, and what has been uploaded for it (or null). */
export interface DocumentSlot {
  document_type: DocumentType
  document: UploadedDocument | null
}

interface ApplicationMessage {
  message: string
}

// Public endpoints: nobody is signed in, so a 401 here is a bad link, never an expired session to refresh.
// The applicant identifies themselves with the emailed link's token, sent in this header on every call.
const TOKEN_HEADER = 'X-Application-Token'
const asApplicant = (token: string, options?: RequestOptions) => ({
  headers: { [TOKEN_HEADER]: token },
  skipAuthRefresh: true,
  signal: options?.signal,
})

export const applicationsService = {
  /** Always answers the same, whether or not the email already applied. The link comes by email. */
  start: (payload: StartApplicationPayload): Promise<ApplicationMessage> =>
    apiClient.post('/applications', payload, { skipAuthRefresh: true }).then((r) => r.data),

  /** Asks for another link (the previous one stops working). Same answer for any email. */
  requestAccessLink: (email: string): Promise<ApplicationMessage> =>
    apiClient.post('/applications/access-link', { email }, { skipAuthRefresh: true }).then((r) => r.data),

  current: (token: string, options?: RequestOptions): Promise<ApplicationView> =>
    apiClient.get('/applications/current', asApplicant(token, options)).then((r) => r.data),

  update: (token: string, payload: UpdateApplicationPayload): Promise<ApplicationView> =>
    apiClient.patch('/applications/current', payload, asApplicant(token)).then((r) => r.data),

  documents: (token: string, options?: RequestOptions): Promise<DocumentSlot[]> =>
    apiClient.get('/applications/current/documents', asApplicant(token, options)).then((r) => r.data),

  /** One file per type of document: uploading again replaces the previous one and sends it back to `pending`. */
  uploadDocument: (token: string, code: string, file: File): Promise<UploadedDocument> => {
    const body = new FormData()
    body.append('file', file)
    return apiClient
      .put(`/applications/current/documents/${encodeURIComponent(code)}`, body, {
        ...asApplicant(token),
        headers: { ...asApplicant(token).headers, 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  deleteDocument: (token: string, code: string): Promise<void> =>
    apiClient.delete(`/applications/current/documents/${encodeURIComponent(code)}`, asApplicant(token)).then(() => undefined),

  submit: (token: string): Promise<ApplicationView> =>
    apiClient.post('/applications/current/submit', undefined, asApplicant(token)).then((r) => r.data),
}
