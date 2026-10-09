import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import ApplicationsTable from './ApplicationsTable'
import ApplicationDetailDialog from './ApplicationDetailDialog'
import { Snackbar } from '../../components/ui'
import { applicationsQueries } from '../../queries/applications'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { t } from '../../lib/i18n'

export default function Applications() {
  const [search, setSearch] = useState('')
  // The box updates on every key; the request waits for a pause in typing.
  const debouncedSearch = useDebouncedValue(search.trim())
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const pagination = usePagination()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { data: response, isLoading, isFetching } = useQuery(
    applicationsQueries.list({ status, type, search: debouncedSearch, page: pagination.page, rowsPerPage: pagination.rowsPerPage }),
  )
  pagination.clamp(response?.total)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.applications.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.applications.subtitle}</Typography>
      </Box>

      <ApplicationsTable
        data={response?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        search={search}
        onSearchChange={(text) => { setSearch(text); pagination.resetPage() }}
        status={status}
        onStatusChange={(next) => { setStatus(next); pagination.resetPage() }}
        type={type}
        onTypeChange={(next) => { setType(next); pagination.resetPage() }}
        pagination={toPaginationProps(pagination, response?.total ?? 0)}
        onView={setSelectedId}
      />

      {selectedId && (
        <ApplicationDetailDialog
          applicationId={selectedId}
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
