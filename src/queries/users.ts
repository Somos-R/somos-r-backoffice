import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { adminUsersService, type AdminUsersListParams } from '../services/users'
import { MIN_SEARCH_LENGTH } from './config'
import { queryKeys, type UsersListKey } from './keys'

/** The list status filter, as the query parameters the server understands. */
function statusParams(status: string): Pick<AdminUsersListParams, 'is_active' | 'locked' | 'pending_activation'> {
  switch (status) {
    case 'active':
      return { is_active: true }
    case 'inactive':
      return { is_active: false }
    case 'locked':
      return { locked: true }
    case 'pending':
      return { pending_activation: true }
    default:
      return {}
  }
}

export const usersQueries = {
  /** One filtered page; the previous page stays on screen while the next one loads. */
  list: (filters: UsersListKey) =>
    queryOptions({
      queryKey: queryKeys.users.list(filters),
      queryFn: ({ signal }) => {
        const q = filters.search.trim()
        return adminUsersService.list(
          {
            q: q.length >= MIN_SEARCH_LENGTH ? q : undefined,
            user_type_code: filters.userType || undefined,
            ...statusParams(filters.status),
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        )
      },
      placeholderData: keepPreviousData,
    }),

  /** The full profile. The server audits every time it is opened, so it is not cached for long. */
  detail: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.users.detail(userId),
      queryFn: ({ signal }) => adminUsersService.detail(userId, { signal }),
      staleTime: 0,
    }),
}
