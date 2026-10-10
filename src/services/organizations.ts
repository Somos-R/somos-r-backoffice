import { apiClient, type RequestOptions } from '../lib/apiClient'
import type { AdminUserSummary } from './users'

export type OrganizationType = 'eca' | 'association'
/** Where an organization is in its onboarding; only `approved` ones operate. */
export type OrganizationStatus = 'draft' | 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'rejected' | 'suspended'
export type LinkStatus = 'requested' | 'active' | 'rejected' | 'removed'

/** A row of the list: the organization with how many people work in it and how many active links it has. */
export interface OrganizationSummary {
  id: string
  type: OrganizationType
  status: OrganizationStatus
  legal_name: string
  tax_id: string | null
  city: string | null
  contact_email: string | null
  created_at: string
  approved_at: string | null
  staff_count: number
  active_links: number
}

export interface OrganizationListResponse {
  total: number
  limit: number
  offset: number
  items: OrganizationSummary[]
}

/** The organization on the other end of a link: an Association for an ECA, an ECA for an Association. */
export interface LinkEntry {
  id: string
  status: LinkStatus
  requested_at: string
  decided_at: string | null
  rejection_reason: string | null
  other: { id: string; type: OrganizationType; legal_name: string; city: string | null }
}

/** The profile with its staff, links and (recyclers of an Association, warehouses of an ECA). Opening it is audited. */
export interface OrganizationDetail extends OrganizationSummary {
  legal_representative: string | null
  contact_phone: string | null
  address: string | null
  updated_at: string
  staff: AdminUserSummary[]
  links: LinkEntry[]
  /** Associations only. */
  recyclers_count: number | null
  /** ECAs only. */
  warehouses: { id: string; name: string; is_active: boolean }[] | null
}

export interface OrganizationsListParams {
  q?: string
  type?: OrganizationType
  status?: OrganizationStatus
  limit?: number
  offset?: number
}

export const organizationsService = {
  list: (params: OrganizationsListParams, options?: RequestOptions): Promise<OrganizationListResponse> =>
    apiClient.get('/admin/organizations', { params, signal: options?.signal }).then((r) => r.data),

  detail: (id: string, options?: RequestOptions): Promise<OrganizationDetail> =>
    apiClient.get(`/admin/organizations/${id}`, { signal: options?.signal }).then((r) => r.data),
}
