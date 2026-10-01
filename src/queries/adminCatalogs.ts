import { queryOptions } from '@tanstack/react-query'
import { adminCatalogsService, type CatalogKind } from '../services/adminCatalogs'
import { queryKeys } from './keys'

export const adminCatalogQueries = {
  list: (kind: CatalogKind) =>
    queryOptions({
      queryKey: queryKeys.adminCatalogs.list(kind),
      queryFn: ({ signal }) => adminCatalogsService.list(kind, { signal }),
    }),
}
