import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import UsersTable from './UsersTable'
import UserDetailDialog from './UserDetailDialog'
import { Snackbar } from '../../components/ui'
import { catalogQueries } from '../../queries/catalogs'
import { usersQueries } from '../../queries/users'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { t } from '../../lib/i18n'

export default function Users() {
  const [search, setSearch] = useState('')
  // The box updates on every key; the request waits for a pause in typing.
  const debouncedSearch = useDebouncedValue(search.trim())
  const [userType, setUserType] = useState('')
  const [status, setStatus] = useState('')
  const pagination = usePagination()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { data: response, isLoading, isFetching } = useQuery(
    usersQueries.list({ userType, status, search: debouncedSearch, page: pagination.page, rowsPerPage: pagination.rowsPerPage }),
  )
  pagination.clamp(response?.total)

  const { data: roles = [] } = useQuery(catalogQueries.roles())
  const roleLabels = { ...(t.sidebar.roles as Record<string, string>), ...Object.fromEntries(roles.map((role) => [role.code, role.label])) }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.users.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.users.subtitle}</Typography>
      </Box>

      <UsersTable
        data={response?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        search={search}
        onSearchChange={(text) => { setSearch(text); pagination.resetPage() }}
        userType={userType}
        onUserTypeChange={(next) => { setUserType(next); pagination.resetPage() }}
        status={status}
        onStatusChange={(next) => { setStatus(next); pagination.resetPage() }}
        pagination={toPaginationProps(pagination, response?.total ?? 0)}
        roleLabels={roleLabels}
        onView={setSelectedId}
      />

      {selectedId && (
        <UserDetailDialog
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onNotify={(message, severity) => setSnackbar({ open: true, message, severity })}
        />
      )}

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  )
}
