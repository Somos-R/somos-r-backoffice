import { apiClient, type RequestOptions } from '../lib/apiClient'

export interface RoleOption {
  code: string
  label: string
  /** Which kind of organization the role belongs to (eca, association...). */
  user_type_code?: string
}

export const catalogsService = {
  /** Every customer role. Somos R's own roles are not listed. */
  roles: (options?: RequestOptions): Promise<RoleOption[]> =>
    apiClient.get('/catalogs/roles', { signal: options?.signal }).then((r) => r.data),
}
