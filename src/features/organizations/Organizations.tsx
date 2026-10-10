import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import OrganizationsTable from './OrganizationsTable'
import OrganizationDetailDialog from './OrganizationDetailDialog'
import { organizationsQueries } from '../../queries/organizations'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { t } from '../../lib/i18n'

export default function Organizations() {
  const [search, setSearch] = useState('')
  // The box updates on every key; the request waits for a pause in typing.
  const debouncedSearch = useDebouncedValue(search.trim())
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const pagination = usePagination()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: response, isLoading, isFetching } = useQuery(
    organizationsQueries.list({ status, type, search: debouncedSearch, page: pagination.page, rowsPerPage: pagination.rowsPerPage }),
  )
  pagination.clamp(response?.total)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.organizations.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.organizations.subtitle}</Typography>
      </Box>

      <OrganizationsTable
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

      {selectedId && <OrganizationDetailDialog organizationId={selectedId} onClose={() => setSelectedId(null)} />}
    </Box>
  )
}
