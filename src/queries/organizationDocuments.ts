import { queryOptions } from '@tanstack/react-query'
import { organizationDocumentsService } from '../services/organizationDocuments'
import { queryKeys } from './keys'

export const organizationDocumentsQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.organizationDocuments.list,
      queryFn: ({ signal }) => organizationDocumentsService.list({ signal }),
    }),
}
