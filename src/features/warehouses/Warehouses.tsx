import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import WarehousesTable from './WarehousesTable'
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormDrawer, Select, Snackbar,
  type FormFieldDef,
} from '../../components/ui'
import { organizationsQueries } from '../../queries/organizations'
import { warehousesQueries } from '../../queries/warehouses'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { warehousesService, type AdminWarehouse, type WarehouseUpdate } from '../../services/warehouses'
import { useRoles } from '../../hooks/useRoles'
import { getApiErrorMessage } from '../../lib/apiError'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { t, interpolate } from '../../lib/i18n'

const NAME_MAX = 100
const ADDRESS_MAX = 300

type Modal = { type: 'assign' | 'deactivate'; warehouse: AdminWarehouse } | null

/** Only what the form really changed; an emptied address is sent as `null` (the server clears it). */
function changesOf(warehouse: AdminWarehouse, values: Record<string, string>): WarehouseUpdate {
  const changes: WarehouseUpdate = {}
  const name = values.name.trim()
  const address = values.address.trim() || null
  if (name !== warehouse.name) changes.name = name
  if (address !== (warehouse.address ?? null)) changes.address = address
  return changes
}

export default function Warehouses() {
  const queryClient = useQueryClient()
  const { can } = useRoles()
  // Owners are named from the organizations list, which needs its own capability. Without it the
  // table still works, but owners can't be named nor picked.
  const canSeeOrganizations = can('organizations.review')

  const [owner, setOwner] = useState('')
  const pagination = usePagination()
  const { data: response, isLoading, isFetching } = useQuery(
    warehousesQueries.list({ owner, page: pagination.page, rowsPerPage: pagination.rowsPerPage }),
  )
  pagination.clamp(response?.total)

  const { data: ecas } = useQuery({ ...organizationsQueries.ecas(), enabled: canSeeOrganizations })
  const ecaNames = useMemo(() => new Map((ecas?.items ?? []).map((eca) => [eca.id, eca.legal_name])), [ecas])
  const approvedEcas = useMemo(
    () => (ecas?.items ?? [])
      .filter((eca) => eca.status === 'approved')
      .map((eca) => ({ value: eca.id, label: eca.legal_name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [ecas],
  )

  const [editing, setEditing] = useState<AdminWarehouse | null>(null)
  const [dialog, setDialog] = useState<Modal>(null)
  const [ecaId, setEcaId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })
  const notify = (message: string, severity: 'success' | 'error') => setSnackbar({ open: true, message, severity })

  // Every action reports its own result, and a failure reloads the list too (someone else may have
  // changed the warehouse, or given it an owner first), so no global notice.
  const onError = (err: unknown) => {
    setDialog(null)
    notify(getApiErrorMessage(err, t.warehouses.messages.error), 'error')
  }
  const done = (message: string) => {
    invalidateAffected(queryClient, AFFECTED.warehouseChanged)
    setEditing(null)
    setDialog(null)
    notify(message, 'success')
  }

  // Values travel as variables: the dialog that holds them is cleared right after confirming.
  const assign = useMutation({
    meta: { silent: true, refreshOnError: AFFECTED.warehouseChanged },
    mutationFn: (v: { warehouse: AdminWarehouse; organizationId: string }) =>
      warehousesService.assignOrganization(v.warehouse.id, v.organizationId),
    onSuccess: (warehouse, v) =>
      done(interpolate(t.warehouses.messages.assigned, { name: warehouse.name, eca: ecaNames.get(v.organizationId) ?? '' })),
    onError,
  })

  const update = useMutation({
    meta: { silent: true, refreshOnError: AFFECTED.warehouseChanged },
    mutationFn: (v: { warehouse: AdminWarehouse; changes: WarehouseUpdate; message: string }) => {
      if (v.changes.is_active !== undefined) setBusyId(v.warehouse.id)
      return warehousesService.update(v.warehouse.id, v.changes)
    },
    onSuccess: (warehouse, v) => done(interpolate(v.message, { name: warehouse.name })),
    onError,
    onSettled: () => setBusyId(null),
  })

  const fields: FormFieldDef[] = [
    {
      name: 'name', label: t.warehouses.edit.nameLabel, type: 'text', required: true,
      validate: (v) => (v.trim().length > NAME_MAX ? t.warehouses.edit.nameTooLong : undefined),
    },
    {
      name: 'address', label: t.warehouses.edit.addressLabel, type: 'text',
      validate: (v) => (v.trim().length > ADDRESS_MAX ? t.warehouses.edit.addressTooLong : undefined),
    },
  ]

  const save = (values: Record<string, string>) => {
    if (!editing) return
    const changes = changesOf(editing, values)
    // The server refuses an empty change; nothing changed, nothing to send.
    if (Object.keys(changes).length === 0) return setEditing(null)
    update.mutate({ warehouse: editing, changes, message: t.warehouses.messages.saved })
  }

  const openAssign = (warehouse: AdminWarehouse) => {
    setEcaId('')
    setDialog({ type: 'assign', warehouse })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.warehouses.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.warehouses.subtitle}</Typography>
      </Box>

      {!canSeeOrganizations && <Alert severity="info">{t.warehouses.ownersUnavailable}</Alert>}

      <WarehousesTable
        data={response?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        owner={owner}
        onOwnerChange={(next) => { setOwner(next); pagination.resetPage() }}
        pagination={toPaginationProps(pagination, response?.total ?? 0)}
        ownerName={(id) => ecaNames.get(id)}
        onAssign={canSeeOrganizations ? openAssign : undefined}
        onEdit={setEditing}
        onDeactivate={(warehouse) => setDialog({ type: 'deactivate', warehouse })}
        onReactivate={(warehouse) =>
          update.mutate({ warehouse, changes: { is_active: true }, message: t.warehouses.messages.reactivated })}
        busyId={busyId}
      />

      <FormDrawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t.warehouses.edit.title}
        fields={fields}
        initialValues={editing ? { name: editing.name, address: editing.address ?? '' } : undefined}
        isSubmitting={update.isPending}
        onSubmit={save}
      />

      {dialog?.type === 'assign' && (
        <Dialog open onClose={() => setDialog(null)} maxWidth="xs">
          <DialogTitle showClose onClose={() => setDialog(null)}>{t.warehouses.assign.title}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" fontWeight={600} mb={1.5}>{dialog.warehouse.name}</Typography>
            {approvedEcas.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t.warehouses.assign.noEcas}</Typography>
            ) : (
              <Select
                label={t.warehouses.assign.ecaLabel}
                value={ecaId}
                onChange={(e) => setEcaId(e.target.value)}
                options={approvedEcas}
                required
              />
            )}
            <Alert severity="warning" sx={{ mt: 2 }}>{t.warehouses.assign.warning}</Alert>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setDialog(null)}>{t.warehouses.actions.keep}</Button>
            <Button
              loading={assign.isPending}
              disabled={!ecaId}
              onClick={() => assign.mutate({ warehouse: dialog.warehouse, organizationId: ecaId })}
            >
              {t.warehouses.assign.confirm}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {dialog?.type === 'deactivate' && (
        <Dialog open onClose={() => setDialog(null)} maxWidth="xs">
          <DialogTitle showClose onClose={() => setDialog(null)}>{t.warehouses.deactivate.title}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" fontWeight={600} mb={0.5}>{dialog.warehouse.name}</Typography>
            <Typography variant="body2" color="text.secondary">{t.warehouses.deactivate.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setDialog(null)}>{t.warehouses.actions.keep}</Button>
            <Button
              variant="destructive"
              loading={update.isPending}
              onClick={() => update.mutate({
                warehouse: dialog.warehouse, changes: { is_active: false }, message: t.warehouses.messages.deactivated,
              })}
            >
              {t.warehouses.actions.deactivate}
            </Button>
          </DialogActions>
        </Dialog>
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
