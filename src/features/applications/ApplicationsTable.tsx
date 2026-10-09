import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Input, Select, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { ApplicationSummary } from '../../services/applications'
import { STATUS_COLOR, STATUS_FILTERS, formatDate, statusLabel, typeLabel } from './applicationStatus'

interface ApplicationsTableProps {
  data: ApplicationSummary[]
  isLoading?: boolean
  /** A new page or filter is loading while the previous rows are still shown. */
  isFetching?: boolean
  search: string
  onSearchChange: (text: string) => void
  status: string
  onStatusChange: (status: string) => void
  type: string
  onTypeChange: (type: string) => void
  pagination: PaginationProps
  onView: (id: string) => void
}

export default function ApplicationsTable({
  data,
  isLoading,
  isFetching,
  search,
  onSearchChange,
  status,
  onStatusChange,
  type,
  onTypeChange,
  pagination,
  onView,
}: ApplicationsTableProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.applications.countPlural : t.applications.countSingular}`

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', gap: 2, flexWrap: 'wrap' }}>
        <Input
          placeholder={t.applications.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth={false}
          sx={{ width: 300 }}
        />
        <Select
          label={t.applications.statusLabel}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[{ value: '', label: t.applications.openQueue }, ...STATUS_FILTERS.map((code) => ({ value: code, label: statusLabel(code) }))]}
          fullWidth={false}
          sx={{ minWidth: 200 }}
        />
        <Select
          label={t.applications.typeLabel}
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          options={[{ value: '', label: t.applications.allTypes }, { value: 'eca', label: typeLabel('eca') }, { value: 'association', label: typeLabel('association') }]}
          fullWidth={false}
          sx={{ minWidth: 170 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {countLabel}
        </Typography>
      </Box>

      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search.trim() ? interpolate(t.applications.emptySearch, { query: search.trim() }) : t.applications.empty}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.applications.table.organization}</TableCell>
                <TableCell>{t.applications.table.type}</TableCell>
                <TableCell>{t.applications.table.applicant}</TableCell>
                <TableCell>{t.applications.table.status}</TableCell>
                <TableCell>{t.applications.table.submitted}</TableCell>
                <TableCell>{t.applications.table.reviewer}</TableCell>
                <TableCell>{t.applications.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((application) => (
                <TableRow key={application.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{application.legal_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {application.tax_id}{application.city ? ` · ${application.city}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{typeLabel(application.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{application.applicant_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{application.applicant_email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Badge label={statusLabel(application.status)} color={STATUS_COLOR[application.status] ?? 'default'} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {application.submitted_at ? formatDate(application.submitted_at) : t.applications.none}
                    {application.submission_count > 1 && (
                      <Typography variant="caption" component="p" color="text.secondary">
                        {interpolate(t.applications.submissionCount, { count: application.submission_count })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{application.reviewer?.full_name ?? t.applications.none}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      aria-label={`${t.applications.view} ${application.legal_name}`}
                      onClick={() => onView(application.id)}
                    >
                      {t.applications.view}
                    </Button>
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
        </>
      )}
    </TableContainer>
  )
}
