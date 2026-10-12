import { apiClient, type RequestOptions } from '../lib/apiClient'

/** A warehouse of any ECA. One with no owner is invisible to customers until Somos R assigns one. */
export interface AdminWarehouse {
  id: string
  name: string
  address: string | null
  is_active: boolean
  /** The owner ECA; `null` until assigned. Once set it never changes. */
  organization_id: string | null
}

export interface WarehouseListResponse {
  total: number
  limit: number
  offset: number
  items: AdminWarehouse[]
}

export interface WarehousesListParams {
  /** true: only the ones without an owner; false: only the ones with one. */
  unassigned?: boolean
  limit?: number
  offset?: number
}

/** What `PATCH` accepts; at least one. `address: null` clears it. */
export interface WarehouseUpdate {
  name?: string
  address?: string | null
  is_active?: boolean
}

export const warehousesService = {
  list: (params: WarehousesListParams, options?: RequestOptions): Promise<WarehouseListResponse> =>
    apiClient.get('/admin/warehouses', { params, signal: options?.signal }).then((r) => r.data),

  /**
   * Give an owner to a warehouse that has none. 409 `already_owned` if it has one (it never changes);
   * the organization must be an approved ECA (`organization_type_mismatch`, `organization_not_active`).
   */
  assignOrganization: (id: string, organizationId: string): Promise<AdminWarehouse> =>
    apiClient.put(`/admin/warehouses/${id}/organization`, { organization_id: organizationId }).then((r) => r.data),

  update: (id: string, payload: WarehouseUpdate): Promise<AdminWarehouse> =>
    apiClient.patch(`/admin/warehouses/${id}`, payload).then((r) => r.data),
}
