import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import AuditTable from './AuditTable'
import AuditEventDialog from './AuditEventDialog'
import { AuditFilters } from './AuditFilters'
import { EMPTY_FILTERS, endOfDayIso, startOfDayIso, type AuditFilterValues } from './auditHelpers'
import { Alert, Button } from '../../components/ui'
import { catalogQueries } from '../../queries/catalogs'
import { auditQueries } from '../../queries/audit'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { t } from '../../lib/i18n'
import type { AuditEvent } from '../../services/audit'

export default function Audit() {
  // What is applied (and therefore queried). The form holds its own draft until "apply".
  const [applied, setApplied] = useState<AuditFilterValues>(EMPTY_FILTERS)
  const pagination = usePagination()
  const [selected, setSelected] = useState<AuditEvent | null>(null)

  const { data: response, isLoading, isFetching, refetch } = useQuery(
    auditQueries.list({
      action: applied.action,
      outcome: applied.outcome,
      actorId: applied.actorId,
      actorRole: applied.actorRole,
      organizationId: applied.organizationId,
      targetType: applied.targetType,
      targetId: applied.targetId,
      requestId: applied.requestId,
      since: startOfDayIso(applied.since),
      until: endOfDayIso(applied.until),
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
    }),
  )
  pagination.clamp(response?.total)

  const { data: roles = [] } = useQuery(catalogQueries.roles())
  const roleLabels = { ...(t.sidebar.roles as Record<string, string>), ...Object.fromEntries(roles.map((role) => [role.code, role.label])) }

  const total = response?.total ?? 0
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.audit.countPlural : t.audit.countSingular}`

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.audit.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.audit.subtitle}</Typography>
      </Box>

      <Alert severity="info">{t.audit.readNotice}</Alert>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <AuditFilters
          applied={applied}
          onApply={(filters) => { setApplied(filters); pagination.resetPage() }}
          onClear={() => { setApplied(EMPTY_FILTERS); pagination.resetPage() }}
        />
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{countLabel}</Typography>
          {/* Reading is audited, so the trail never reloads by itself: reloading is this explicit choice. */}
          <Button variant="text" size="small" loading={isFetching} onClick={() => void refetch()}>{t.audit.refresh}</Button>
        </Box>
        <AuditTable
          data={response?.items ?? []}
          isLoading={isLoading}
          isFetching={isFetching}
          pagination={toPaginationProps(pagination, total)}
          roleLabels={roleLabels}
          onView={setSelected}
        />
      </Box>

      {selected && <AuditEventDialog event={selected} roleLabels={roleLabels} onClose={() => setSelected(null)} />}
    </Box>
  )
}
