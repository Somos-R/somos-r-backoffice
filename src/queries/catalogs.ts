import { queryOptions } from '@tanstack/react-query'
import { catalogsService } from '../services/catalogs'
import { STALE_TIME } from './config'
import { queryKeys } from './keys'

// Defined once and used by every screen that needs them: the same catalog can't end up with a
// different cache lifetime depending on which screen asked first.
export const catalogQueries = {
  roles: () =>
    queryOptions({
      queryKey: queryKeys.catalogs.roles,
      queryFn: ({ signal }) => catalogsService.roles({ signal }),
      staleTime: STALE_TIME.catalog,
    }),
}
