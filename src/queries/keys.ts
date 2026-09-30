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

export const queryKeys = {
  /** The signed-in Somos R account (`GET /admin/me`). */
  me: ['me'] as const,

  catalogs: {
    all: ['catalogs'] as const,
    roles: ['catalogs', 'roles'] as const,
  },

  users: {
    all: ['users'] as const,
    list: (filters: UsersListKey) => ['users', 'list', filters] as const,
    detail: (userId: string) => ['users', 'detail', userId] as const,
  },
}
