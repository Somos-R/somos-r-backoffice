// Every React Query key of the app, in one place (same rules as somos-r-web):
// - The first element is the resource, so `invalidateQueries` (which matches by prefix) reloads
//   everything under a root: every list, count and detail.
// - Catalogs have their OWN root, apart from the data that references them.
// - Keys carry every input the request depends on (filters, page), so different inputs never
//   share a cache entry.

/** Filters of the users list; `status` is one of '', 'active', 'inactive', 'locked', 'pending'. */
export interface UsersListKey {
  userType: string
  status: string
  search: string
  page: number
  rowsPerPage: number
}

/** Filters of the review queue; '' means "no filter" (the default status filter is the open queue). */
export interface ApplicationsListKey {
  status: string
  type: string
  search: string
  page: number
  rowsPerPage: number
}

/** Filters of the organizations list; '' means "no filter". */
export interface OrganizationsListKey {
  status: string
  type: string
  search: string
  page: number
  rowsPerPage: number
}

/** Filters of the audit trail. Empty strings mean "no filter"; `since`/`until` are ISO 8601. */
export interface AuditListKey {
  action: string
  outcome: string
  actorId: string
  actorRole: string
  organizationId: string
  targetType: string
  targetId: string
  requestId: string
  since: string
  until: string
  page: number
  rowsPerPage: number
}

import type { CatalogKind } from '../services/adminCatalogs'

export const queryKeys = {
  /** The signed-in Somos R account (`GET /admin/me`). */
  me: ['me'] as const,

  catalogs: {
    all: ['catalogs'] as const,
    roles: ['catalogs', 'roles'] as const,
  },

  /** Somos R's own view of the catalogs it maintains (includes the inactive entries). */
  adminCatalogs: {
    all: ['adminCatalogs'] as const,
    list: (kind: CatalogKind) => ['adminCatalogs', kind] as const,
  },

  applications: {
    all: ['applications'] as const,
    list: (filters: ApplicationsListKey) => ['applications', 'list', filters] as const,
    detail: (id: string) => ['applications', 'detail', id] as const,
  },

  organizations: {
    all: ['organizations'] as const,
    list: (filters: OrganizationsListKey) => ['organizations', 'list', filters] as const,
    detail: (id: string) => ['organizations', 'detail', id] as const,
  },

  audit: {
    all: ['audit'] as const,
    list: (filters: AuditListKey) => ['audit', 'list', filters] as const,
  },

  users: {
    all: ['users'] as const,
    list: (filters: UsersListKey) => ['users', 'list', filters] as const,
    detail: (userId: string) => ['users', 'detail', userId] as const,
  },
}
