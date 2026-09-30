import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { adminAuditService } from '../services/audit'
import { queryKeys, type AuditListKey } from './keys'

/** Empty filters are left out instead of being sent as empty strings. */
const orUndefined = (value: string) => value.trim() || undefined

export const auditQueries = {
  list: (filters: AuditListKey) =>
    queryOptions({
      queryKey: queryKeys.audit.list(filters),
      queryFn: ({ signal }) =>
        adminAuditService.list(
          {
            action: orUndefined(filters.action),
            outcome: orUndefined(filters.outcome),
            actor_id: orUndefined(filters.actorId),
            actor_role: orUndefined(filters.actorRole),
            organization_id: orUndefined(filters.organizationId),
            target_type: orUndefined(filters.targetType),
            target_id: orUndefined(filters.targetId),
            request_id: orUndefined(filters.requestId),
            since: orUndefined(filters.since),
            until: orUndefined(filters.until),
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        ),
      placeholderData: keepPreviousData,
      // Every read is recorded in the trail itself: don't reload it just because the tab got focus
      // or the screen was reopened a moment later. Reloading is an explicit choice (apply filters).
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    }),
}
