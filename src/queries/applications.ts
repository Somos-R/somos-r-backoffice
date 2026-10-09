import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { applicationsService, type ApplicationStatus, type OrganizationType } from '../services/applications'
import { MIN_SEARCH_LENGTH } from './config'
import { queryKeys, type ApplicationsListKey } from './keys'

export const applicationsQueries = {
  /** One filtered page; the previous page stays on screen while the next one loads. */
  list: (filters: ApplicationsListKey) =>
    queryOptions({
      queryKey: queryKeys.applications.list(filters),
      queryFn: ({ signal }) => {
        const q = filters.search.trim()
        return applicationsService.list(
          {
            status: (filters.status || undefined) as ApplicationStatus | undefined,
            type: (filters.type || undefined) as OrganizationType | undefined,
            q: q.length >= MIN_SEARCH_LENGTH ? q : undefined,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        )
      },
      placeholderData: keepPreviousData,
    }),

  /** The server audits every time it is opened, so it is not cached for long. */
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.applications.detail(id),
      queryFn: ({ signal }) => applicationsService.detail(id, { signal }),
      staleTime: 0,
    }),
}
