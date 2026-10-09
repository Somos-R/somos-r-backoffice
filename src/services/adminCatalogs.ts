import { apiClient, type RequestOptions } from '../lib/apiClient'

/** The two catalogs Somos R maintains from here. The path segment is the kind. */
export type CatalogKind = 'materials' | 'document-types'

/** One entry, active or not (the portals' public lists only carry the active ones). */
export interface AdminCatalogEntry {
  /** Immutable: other records point at it. */
  code: string
  label: string
  /** Materials only: the unit they are weighed in. */
  unit?: string
  is_active: boolean
}

export const adminCatalogsService = {
  list: (kind: CatalogKind, options?: RequestOptions): Promise<AdminCatalogEntry[]> =>
    apiClient.get(`/admin/catalogs/${kind}`, { signal: options?.signal }).then((r) => r.data),

  /** 409 `code_already_exists` when taken; 422 `invalid_code` when the format is wrong. */
  create: (kind: CatalogKind, payload: { code: string; label: string }): Promise<AdminCatalogEntry> =>
    apiClient.post(`/admin/catalogs/${kind}`, payload).then((r) => r.data),

  /** Rename and/or (de)activate; at least one. Nothing is ever deleted: deactivating only stops new use. */
  update: (kind: CatalogKind, code: string, payload: { label?: string; is_active?: boolean }): Promise<AdminCatalogEntry> =>
    apiClient.patch(`/admin/catalogs/${kind}/${encodeURIComponent(code)}`, payload).then((r) => r.data),
}
