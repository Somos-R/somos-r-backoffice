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

/** One earlier decision on the application. */
export interface ApplicationReview {
  id: string
  decision: 'approved' | 'changes_requested' | 'rejected'
  summary: string | null
  submission_number: number
  /** Documents with a problem, when changes were requested. */
  details: unknown[]
  created_at: string
  reviewer: { id: string; full_name: string } | null
}

/** Everything the reviewer needs. The server audits every time it is opened. */
export interface ApplicationDetail extends ApplicationSummary {
  legal_representative: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  applicant_id_type: string
  applicant_id_number: string
  applicant_phone: string | null
  email_verified_at: string | null
  consent_at: string | null
  consent_version: string | null
  reviews: ApplicationReview[]
}

export interface ApplicationsListParams {
  status?: ApplicationStatus
  type?: OrganizationType
  q?: string
  limit?: number
  offset?: number
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

  /**
   * `request_changes` and `reject` need a summary of at least 10 characters. `approve` creates the first
   * administrator and emails the activation link; it is refused while a required document is not approved.
   */
  decide: (id: string, payload: { decision: ApplicationDecision; summary?: string }): Promise<ApplicationDetail> =>
    apiClient.post(`/admin/applications/${id}/decision`, payload).then((r) => r.data),
}
