import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Badge, Button, Loader, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
} from '../../components/ui'
import { t } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { AdminWarehouse } from '../../services/warehouses'

const OWNER_FILTERS = ['unassigned', 'assigned'] as const

interface WarehousesTableProps {
  data: AdminWarehouse[]
  isLoading?: boolean
  /** A new page or filter is loading while the previous rows are still shown. */
  isFetching?: boolean
  owner: string
  onOwnerChange: (owner: string) => void
  pagination: PaginationProps
  /** The owner's name, or `undefined` when it can't be told (no permission, or not in the list). */
  ownerName: (organizationId: string) => string | undefined
  /** Absent when the account can't pick an owner: the action isn't offered. */
  onAssign?: (warehouse: AdminWarehouse) => void
  onEdit: (warehouse: AdminWarehouse) => void
  onDeactivate: (warehouse: AdminWarehouse) => void
  onReactivate: (warehouse: AdminWarehouse) => void
  /** The warehouse being reactivated; every (de)activation waits for it. */
  busyId: string | null
}

export default function WarehousesTable({
  data, isLoading, isFetching, owner, onOwnerChange, pagination, ownerName,
  onAssign, onEdit, onDeactivate, onReactivate, busyId,
}: WarehousesTableProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.warehouses.countPlural : t.warehouses.countSingular}`

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', gap: 2, flexWrap: 'wrap' }}>
        <Select
          label={t.warehouses.ownerLabel}
          value={owner}
          onChange={(e) => onOwnerChange(e.target.value)}
          options={[
            { value: '', label: t.warehouses.ownerFilter.all },
            ...OWNER_FILTERS.map((code) => ({ value: code, label: t.warehouses.ownerFilter[code] })),
          ]}
          fullWidth={false}
          sx={{ minWidth: 180 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {countLabel}
        </Typography>
      </Box>

      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">{t.warehouses.empty}</Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.warehouses.table.name}</TableCell>
                <TableCell>{t.warehouses.table.address}</TableCell>
                <TableCell>{t.warehouses.table.owner}</TableCell>
                <TableCell>{t.warehouses.table.status}</TableCell>
                <TableCell>{t.warehouses.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((warehouse) => (
                <TableRow key={warehouse.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{warehouse.name}</TableCell>
                  <TableCell>{warehouse.address || t.warehouses.none}</TableCell>
                  <TableCell>
                    {warehouse.organization_id === null ? (
                      <Badge label={t.warehouses.noOwner} color="warning" />
                    ) : (
                      ownerName(warehouse.organization_id) ?? (
                        <Typography variant="body2" color="text.secondary" component="span">{t.warehouses.unknownOwner}</Typography>
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={warehouse.is_active ? t.warehouses.status.active : t.warehouses.status.inactive}
                      color={warehouse.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {warehouse.organization_id === null && onAssign && (
                        <Button size="small" aria-label={`${t.warehouses.actions.assign} ${warehouse.name}`} onClick={() => onAssign(warehouse)}>
                          {t.warehouses.actions.assign}
                        </Button>
                      )}
                      <Button variant="outlined" size="small" aria-label={`${t.warehouses.actions.edit} ${warehouse.name}`} onClick={() => onEdit(warehouse)}>
                        {t.warehouses.actions.edit}
                      </Button>
                      {warehouse.is_active ? (
                        <Button
                          variant="outlined" size="small" disabled={!!busyId}
                          aria-label={`${t.warehouses.actions.deactivate} ${warehouse.name}`}
                          onClick={() => onDeactivate(warehouse)}
                        >
                          {t.warehouses.actions.deactivate}
                        </Button>
                      ) : (
                        <Button
                          variant="outlined" size="small" loading={busyId === warehouse.id} disabled={!!busyId}
                          aria-label={`${t.warehouses.actions.reactivate} ${warehouse.name}`}
                          onClick={() => onReactivate(warehouse)}
                        >
                          {t.warehouses.actions.reactivate}
                        </Button>
                      )}
                    </Box>
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
