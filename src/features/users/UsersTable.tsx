import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Input, Select, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { AdminUserSummary } from '../../services/users'
import { STATUS_FILTERS, USER_TYPES, statusesOf, typeLabel, type UserStatus } from './userStatus'

const STATUS_COLOR: Record<UserStatus, 'success' | 'warning' | 'error'> = {
  active: 'success',
  pending: 'warning',
  locked: 'warning',
  inactive: 'error',
}

interface UsersTableProps {
  data: AdminUserSummary[]
  isLoading?: boolean
  /** A new page or filter is loading while the previous rows are still shown. */
  isFetching?: boolean
  search: string
  onSearchChange: (text: string) => void
  userType: string
  onUserTypeChange: (userType: string) => void
  status: string
  onStatusChange: (status: string) => void
  pagination: PaginationProps
  /** Role code → label, from the roles catalog. */
  roleLabels: Record<string, string>
  onView: (userId: string) => void
}

export default function UsersTable({
  data,
  isLoading,
  isFetching,
  search,
  onSearchChange,
  userType,
  onUserTypeChange,
  status,
  onStatusChange,
  pagination,
  roleLabels,
  onView,
}: UsersTableProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.users.countPlural : t.users.countSingular}`

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', gap: 2, flexWrap: 'wrap' }}>
        <Input
          placeholder={t.users.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth={false}
          sx={{ width: 300 }}
        />
        <Select
          label={t.users.typeLabel}
          value={userType}
          onChange={(e) => onUserTypeChange(e.target.value)}
          options={[{ value: '', label: t.users.allTypes }, ...USER_TYPES.map((code) => ({ value: code, label: typeLabel(code) }))]}
          fullWidth={false}
          sx={{ minWidth: 170 }}
        />
        <Select
          label={t.users.statusLabel}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[{ value: '', label: t.users.allStatuses }, ...STATUS_FILTERS.map((code) => ({ value: code, label: t.users.filterStatus[code] }))]}
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
            {search.trim() ? interpolate(t.users.emptySearch, { query: search.trim() }) : t.users.empty}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.users.table.name}</TableCell>
                <TableCell>{t.users.table.type}</TableCell>
                <TableCell>{t.users.table.role}</TableCell>
                <TableCell>{t.users.table.status}</TableCell>
                <TableCell>{t.users.table.created}</TableCell>
                <TableCell>{t.users.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{user.full_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                  </TableCell>
                  <TableCell>{typeLabel(user.user_type_code)}</TableCell>
                  <TableCell>{(user.role_code && roleLabels[user.role_code]) || user.role_code || t.users.detail.none}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {statusesOf(user).map((state) => (
                        <Badge key={state} label={t.users.status[state]} color={STATUS_COLOR[state]} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {new Date(user.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" onClick={() => onView(user.id)}>
                      {t.users.view}
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
