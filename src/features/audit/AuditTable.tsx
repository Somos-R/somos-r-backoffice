import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { AuditEvent } from '../../services/audit'
import { actionLabel, formatWhen, shortId } from './auditHelpers'

interface Props {
  data: AuditEvent[]
  isLoading?: boolean
  /** A new page or filter is loading while the previous rows are still shown. */
  isFetching?: boolean
  pagination: PaginationProps
  /** Role code → label. */
  roleLabels: Record<string, string>
  onView: (event: AuditEvent) => void
}

export default function AuditTable({ data, isLoading, isFetching, pagination, roleLabels, onView }: Props) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  if (data.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">{t.audit.empty}</Typography>
      </Box>
    )
  }

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t.audit.table.when}</TableCell>
            <TableCell>{t.audit.table.action}</TableCell>
            <TableCell>{t.audit.table.outcome}</TableCell>
            <TableCell>{t.audit.table.actor}</TableCell>
            <TableCell>{t.audit.table.target}</TableCell>
            <TableCell>{t.audit.table.ip}</TableCell>
            <TableCell>{t.audit.table.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((event) => (
            <TableRow key={event.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatWhen(event.occurred_at)}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>{actionLabel(event.action)}</Typography>
                {/* The code is shown under its label; an action this build doesn't know has no label, so no repeat. */}
                {actionLabel(event.action) !== event.action && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{event.action}</Typography>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  label={event.outcome === 'success' ? t.audit.outcome.success : event.outcome === 'failure' ? t.audit.outcome.failure : event.outcome}
                  color={event.outcome === 'success' ? 'success' : 'error'}
                />
              </TableCell>
              <TableCell>
                {event.actor_id ? (
                  <>
                    <Typography variant="body2">{(event.actor_role && roleLabels[event.actor_role]) || event.actor_role || t.audit.detail.none}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{shortId(event.actor_id)}</Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">{t.audit.system}</Typography>
                )}
              </TableCell>
              <TableCell>
                {event.target_type ? (
                  <>
                    <Typography variant="body2">{event.target_type}</Typography>
                    {event.target_id && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{shortId(event.target_id)}</Typography>
                    )}
                  </>
                ) : (
                  t.audit.detail.none
                )}
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{event.ip ?? t.audit.detail.none}</TableCell>
              <TableCell>
                <Button variant="outlined" size="small" onClick={() => onView(event)}>{t.audit.view}</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        count={pagination.total}
        page={pagination.page}
        rowsPerPage={pagination.rowsPerPage}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        onPageChange={(_, page) => pagination.onPageChange(page)}
        onRowsPerPageChange={(e) => pagination.onRowsPerPageChange(+e.target.value)}
      />
    </TableContainer>
  )
}
