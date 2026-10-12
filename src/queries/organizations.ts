import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { organizationsService, type OrganizationStatus, type OrganizationType } from '../services/organizations'
import { MIN_SEARCH_LENGTH } from './config'
import { queryKeys, type OrganizationsListKey } from './keys'

/** The most the server returns in one page. */
export const ECAS_LIMIT = 200

export const organizationsQueries = {
  /** One filtered page; the previous page stays on screen while the next one loads. */
  list: (filters: OrganizationsListKey) =>
    queryOptions({
      queryKey: queryKeys.organizations.list(filters),
      queryFn: ({ signal }) => {
        const q = filters.search.trim()
        return organizationsService.list(
          {
            q: q.length >= MIN_SEARCH_LENGTH ? q : undefined,
            type: (filters.type || undefined) as OrganizationType | undefined,
            status: (filters.status || undefined) as OrganizationStatus | undefined,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        )
      },
      placeholderData: keepPreviousData,
    }),

  /**
   * Every ECA, whatever its status, in one request: the warehouses screen names owners with it and
   * offers the approved ones as new owners. The server caps a page at 200; past that, an owner off
   * the list shows as unknown (`total` tells).
   */
  ecas: () =>
    queryOptions({
      queryKey: queryKeys.organizations.ecas,
      queryFn: ({ signal }) => organizationsService.list({ type: 'eca', limit: ECAS_LIMIT }, { signal }),
    }),

  /** The server audits every time it is opened, so it is not cached for long. */
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.organizations.detail(id),
      queryFn: ({ signal }) => organizationsService.detail(id, { signal }),
      staleTime: 0,
    }),
}
