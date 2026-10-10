import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Input, Select, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { OrganizationSummary } from '../../services/organizations'
import { STATUS_COLOR, STATUS_FILTERS, formatDate, statusLabel, typeLabel } from './organizationStatus'

interface OrganizationsTableProps {
  data: OrganizationSummary[]
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

export default function OrganizationsTable({
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
}: OrganizationsTableProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.organizations.countPlural : t.organizations.countSingular}`

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', gap: 2, flexWrap: 'wrap' }}>
        <Input
          placeholder={t.organizations.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth={false}
          sx={{ width: 300 }}
        />
        <Select
          label={t.organizations.typeLabel}
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          options={[{ value: '', label: t.organizations.allTypes }, { value: 'eca', label: typeLabel('eca') }, { value: 'association', label: typeLabel('association') }]}
          fullWidth={false}
          sx={{ minWidth: 170 }}
        />
        <Select
          label={t.organizations.statusLabel}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[{ value: '', label: t.organizations.allStatuses }, ...STATUS_FILTERS.map((code) => ({ value: code, label: statusLabel(code) }))]}
          fullWidth={false}
          sx={{ minWidth: 200 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {countLabel}
        </Typography>
      </Box>

      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search.trim() ? interpolate(t.organizations.emptySearch, { query: search.trim() }) : t.organizations.empty}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.organizations.table.organization}</TableCell>
                <TableCell>{t.organizations.table.type}</TableCell>
                <TableCell>{t.organizations.table.status}</TableCell>
                <TableCell>{t.organizations.table.staff}</TableCell>
                <TableCell>{t.organizations.table.links}</TableCell>
                <TableCell>{t.organizations.table.approved}</TableCell>
                <TableCell>{t.organizations.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((organization) => (
                <TableRow key={organization.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{organization.legal_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[organization.tax_id, organization.city].filter(Boolean).join(' · ') || t.organizations.none}
                    </Typography>
                  </TableCell>
                  <TableCell>{typeLabel(organization.type)}</TableCell>
                  <TableCell>
                    <Badge label={statusLabel(organization.status)} color={STATUS_COLOR[organization.status] ?? 'default'} />
                  </TableCell>
                  <TableCell>{organization.staff_count}</TableCell>
                  <TableCell>{organization.active_links}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {organization.approved_at ? formatDate(organization.approved_at) : t.organizations.none}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      aria-label={`${t.organizations.view} ${organization.legal_name}`}
                      onClick={() => onView(organization.id)}
                    >
                      {t.organizations.view}
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
