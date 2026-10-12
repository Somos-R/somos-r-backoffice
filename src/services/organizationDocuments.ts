import { apiClient, type RequestOptions } from '../lib/apiClient'

export type OrganizationType = 'eca' | 'association'

/** One document Somos R asks for in an organization's application, by type of organization. */
export interface OrganizationDocumentEntry {
  /** Immutable: an application's upload points at it. */
  code: string
  organization_type: OrganizationType
  label: string
  is_required: boolean
  is_active: boolean
  sort_order: number
}

export interface CreateOrganizationDocumentPayload {
  code: string
  label: string
  organization_type: OrganizationType
  is_required: boolean
  sort_order: number
}

export interface UpdateOrganizationDocumentPayload {
  label?: string
  is_required?: boolean
  is_active?: boolean
  sort_order?: number
}

export const organizationDocumentsService = {
  list: (options?: RequestOptions): Promise<OrganizationDocumentEntry[]> =>
    apiClient.get('/admin/catalogs/organization-documents', { signal: options?.signal }).then((r) => r.data),

  /** 409 `code_already_exists` when taken; 422 `invalid_code` when the format is wrong. */
  create: (payload: CreateOrganizationDocumentPayload): Promise<OrganizationDocumentEntry> =>
    apiClient.post('/admin/catalogs/organization-documents', payload).then((r) => r.data),

  /** At least one field. Deactivating only affects applications sent from here on; what was already
   * uploaded against this document stays. */
  update: (code: string, payload: UpdateOrganizationDocumentPayload): Promise<OrganizationDocumentEntry> =>
    apiClient.patch(`/admin/catalogs/organization-documents/${encodeURIComponent(code)}`, payload).then((r) => r.data),
}
