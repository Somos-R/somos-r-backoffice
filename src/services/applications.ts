import { apiClient, type RequestOptions } from '../lib/apiClient'

export type ApplicationStatus = 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'rejected'
export type ApplicationDecision = 'approve' | 'request_changes' | 'reject'
export type OrganizationType = 'eca' | 'association'

/** A row of the review queue. `id` is the organization's id: that is how an application is addressed. */
export interface ApplicationSummary {
  id: string
  type: OrganizationType
  status: ApplicationStatus
  legal_name: string
  tax_id: string
  city: string | null
  applicant_name: string
  applicant_email: string
  submitted_at: string | null
  /** How many times it was sent (more than once after changes were requested). */
  submission_count: number
  review_started_at: string | null
  reviewer: { id: string; full_name: string } | null
}

export interface ApplicationListResponse {
  total: number
  limit: number
  offset: number
  items: ApplicationSummary[]
}

export type DocumentStatus = 'pending' | 'ok' | 'missing' | 'not_compliant'
/** A verdict on one document; `missing` and `not_compliant` need a comment the applicant will read. */
export type DocumentVerdict = Exclude<DocumentStatus, 'pending'>

/** What was uploaded for a requested document. */
export interface ReviewedDocument {
  id: string
  original_name: string
  content_type: string
  size_bytes: number
  uploaded_at: string
  status: DocumentStatus
  review_comment: string | null
  reviewed_at: string | null
  reviewed_by: { id: string; full_name: string } | null
}

/** A document the organization is asked for, and what it uploaded (or null). */
export interface DocumentSlot {
  document_type: { code: string; label: string; is_required: boolean }
  document: ReviewedDocument | null
}

/** A document sent back with a review, as it was then. */
export interface SentBackDocument {
  code: string
  label: string
  status: string
  comment: string | null
}

/** One earlier decision on the application. */
export interface ApplicationReview {
  id: string
  decision: 'approved' | 'changes_requested' | 'rejected'
  summary: string | null
  submission_number: number
  /** Documents with a problem, when changes were requested. */
  details: SentBackDocument[]
  created_at: string
  reviewer: { id: string; full_name: string } | null
}

/** Everything the reviewer needs. The server audits every time it is opened. */
export interface ApplicationDetail extends ApplicationSummary {
  legal_representative: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  applicant_id_type: string | null
  applicant_id_number: string | null
  applicant_phone: string | null
  email_verified_at: string | null
  consent_at: string | null
  consent_version: string | null
  documents: DocumentSlot[]
  reviews: ApplicationReview[]
}

export interface ApplicationsListParams {
  status?: ApplicationStatus
  type?: OrganizationType
  q?: string
  limit?: number
  offset?: number
}

/** A signed link, valid for a few minutes. `url` is a PATH of the API, not a full address. */
export interface DocumentAccess {
  url: string
  expires_at: string
}

export const applicationsService = {
  /** Without `status`, the queue: submitted, in review and changes requested, oldest submission first. */
  list: (params: ApplicationsListParams, options?: RequestOptions): Promise<ApplicationListResponse> =>
    apiClient.get('/admin/applications', { params, signal: options?.signal }).then((r) => r.data),

  detail: (id: string, options?: RequestOptions): Promise<ApplicationDetail> =>
    apiClient.get(`/admin/applications/${id}`, { signal: options?.signal }).then((r) => r.data),

  /** Takes it (submitted → in review). 409 `already_in_review` when someone else has it. */
  startReview: (id: string): Promise<ApplicationDetail> =>
    apiClient.post(`/admin/applications/${id}/start-review`).then((r) => r.data),

  /** Asks for a signed link to the file (this is the act of viewing it, and the server audits it). */
  openDocument: (id: string, documentId: string): Promise<DocumentAccess> =>
    apiClient.post(`/admin/applications/${id}/documents/${documentId}/access`).then((r) => r.data),

  /** Only while the application is submitted or in review; 422 `comment_required` without a comment on a problem. */
  reviewDocument: (id: string, documentId: string, payload: { status: DocumentVerdict; comment?: string }): Promise<DocumentSlot> =>
    apiClient.patch(`/admin/applications/${id}/documents/${documentId}`, payload).then((r) => r.data),

  /**
   * `request_changes` and `reject` need a summary of at least 10 characters. `approve` creates the first
   * administrator and emails the activation link; it is refused while a required document is not approved.
   */
  decide: (id: string, payload: { decision: ApplicationDecision; summary?: string }): Promise<ApplicationDetail> =>
    apiClient.post(`/admin/applications/${id}/decision`, payload).then((r) => r.data),
}
