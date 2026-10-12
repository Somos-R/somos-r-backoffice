import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  Badge, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormDrawer, Input, Loader,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, type FormFieldDef,
} from '../../components/ui'
import { organizationDocumentsQueries } from '../../queries/organizationDocuments'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import {
  organizationDocumentsService, type OrganizationDocumentEntry, type OrganizationType,
} from '../../services/organizationDocuments'
import { getApiErrorMessage } from '../../lib/apiError'
import { t, interpolate } from '../../lib/i18n'

// The format the server enforces (and answers 422 `invalid_code` for): checked here too so the
// operator finds out before sending.
const CODE_PATTERN = /^[a-z][a-z0-9_]{1,39}$/

const ORG_TYPE_OPTIONS = [
  { value: 'eca', label: t.organizations.types.eca },
  { value: 'association', label: t.organizations.types.association },
]

type Modal = { type: 'edit' | 'deactivate'; entry: OrganizationDocumentEntry } | null

/** The documents an application must attach, by organization type (eca/association) — its own shape
 * (not another `CatalogSection` kind): `organization_type` is set once at creation, and `is_required` /
 * `sort_order` are editable afterward. */
export default function OrganizationDocumentsSection({
  onNotify,
}: {
  onNotify: (message: string, severity: 'success' | 'error') => void
}) {
  const queryClient = useQueryClient()
  const { data: entries = [], isLoading } = useQuery(organizationDocumentsQueries.list())

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialog, setDialog] = useState<Modal>(null)
  const [label, setLabel] = useState('')
  const [required, setRequired] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [busyCode, setBusyCode] = useState<string | null>(null)

  // Every action reports its own result, and a failure reloads the list too (someone else may have
  // changed the entry), so no global notice.
  const useAction = <V,>(
    mutationFn: (v: V) => Promise<OrganizationDocumentEntry>,
    success: (entry: OrganizationDocumentEntry, v: V) => string,
  ) =>
    useMutation({
      meta: { silent: true, refreshOnError: AFFECTED.organizationDocumentChanged },
      mutationFn,
      onSuccess: (entry, variables) => {
        invalidateAffected(queryClient, AFFECTED.organizationDocumentChanged)
        setDrawerOpen(false)
        setDialog(null)
        onNotify(success(entry, variables), 'success')
      },
      onError: (err) => {
        setDialog(null)
        onNotify(getApiErrorMessage(err, t.catalogs.messages.error), 'error')
      },
      onSettled: () => setBusyCode(null),
    })

  const create = useAction(
    (v: { code: string; label: string; organization_type: OrganizationType }) =>
      organizationDocumentsService.create({ ...v, is_required: true, sort_order: 0 }),
    (entry) => interpolate(t.catalogs.messages.created, { name: entry.label }),
  )
  const save = useAction(
    (v: { code: string; label: string; is_required: boolean; sort_order: number }) =>
      organizationDocumentsService.update(v.code, { label: v.label, is_required: v.is_required, sort_order: v.sort_order }),
    (entry) => interpolate(t.catalogs.messages.renamed, { name: entry.label }),
  )
  const setActive = useAction(
    (v: { code: string; active: boolean }) => {
      setBusyCode(v.code)
      return organizationDocumentsService.update(v.code, { is_active: v.active })
    },
    (entry, v) => interpolate(v.active ? t.catalogs.messages.reactivated : t.catalogs.messages.deactivated, { name: entry.label }),
  )

  const fields: FormFieldDef[] = [
    {
      name: 'code', label: t.organizationDocuments.codeLabel, type: 'text', required: true,
      validate: (v) => (CODE_PATTERN.test(v.trim()) ? undefined : t.organizationDocuments.codeFormat),
    },
    { name: 'label', label: t.organizationDocuments.nameLabel, type: 'text', required: true },
    {
      name: 'organization_type', label: t.organizationDocuments.organizationTypeLabel, type: 'select',
      required: true, options: ORG_TYPE_OPTIONS,
    },
  ]

  const openEdit = (entry: OrganizationDocumentEntry) => {
    setLabel(entry.label)
    setRequired(entry.is_required)
    setSortOrder(String(entry.sort_order))
    setDialog({ type: 'edit', entry })
  }

  const typeLabel = (type: OrganizationType) =>
    type === 'eca' ? t.organizations.types.eca : t.organizations.types.association

  const sorted = [...entries].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Box component="section" aria-label={t.organizationDocuments.title} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={600}>{t.organizationDocuments.title}</Typography>
        <Button size="small" startIcon={<Plus size={16} />} onClick={() => setDrawerOpen(true)}>{t.organizationDocuments.add}</Button>
      </Box>
      <Typography variant="body2" color="text.secondary">{t.organizationDocuments.subtitle}</Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>
      ) : sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{t.organizationDocuments.empty}</Typography>
      ) : (
        <TableContainer>
          <Table aria-label={t.organizationDocuments.title}>
            <TableHead>
              <TableRow>
                <TableCell>{t.organizationDocuments.table.name}</TableCell>
                <TableCell>{t.organizationDocuments.table.organizationType}</TableCell>
                <TableCell>{t.organizationDocuments.table.required}</TableCell>
                <TableCell>{t.organizationDocuments.table.order}</TableCell>
                <TableCell>{t.catalogs.table.status}</TableCell>
                <TableCell>{t.organizationDocuments.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((entry) => (
                <TableRow key={entry.code} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{entry.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{entry.code}</Typography>
                  </TableCell>
                  <TableCell>{typeLabel(entry.organization_type)}</TableCell>
                  <TableCell>
                    <Badge
                      label={entry.is_required ? t.organizationDocuments.table.required : t.organizationDocuments.table.optional}
                      color={entry.is_required ? 'default' : 'info'}
                    />
                  </TableCell>
                  <TableCell>{entry.sort_order}</TableCell>
                  <TableCell>
                    <Badge
                      label={entry.is_active ? t.catalogs.status.active : t.catalogs.status.inactive}
                      color={entry.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button variant="outlined" size="small" aria-label={`${t.catalogs.actions.edit} ${entry.label}`} onClick={() => openEdit(entry)}>
                        {t.catalogs.actions.edit}
                      </Button>
                      {entry.is_active ? (
                        <Button
                          variant="outlined" size="small" disabled={!!busyCode}
                          aria-label={`${t.catalogs.actions.deactivate} ${entry.label}`}
                          onClick={() => setDialog({ type: 'deactivate', entry })}
                        >
                          {t.catalogs.actions.deactivate}
                        </Button>
                      ) : (
                        <Button
                          variant="outlined" size="small" loading={busyCode === entry.code} disabled={!!busyCode}
                          aria-label={`${t.catalogs.actions.reactivate} ${entry.label}`}
                          onClick={() => setActive.mutate({ code: entry.code, active: true })}
                        >
                          {t.catalogs.actions.reactivate}
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t.organizationDocuments.drawerTitle}
        fields={fields}
        isSubmitting={create.isPending}
        onSubmit={(values) =>
          create.mutate({
            code: values.code.trim(),
            label: values.label.trim(),
            organization_type: values.organization_type as OrganizationType,
          })
        }
      />

      {dialog?.type === 'edit' && (
        <Dialog open onClose={() => setDialog(null)} maxWidth="xs">
          <DialogTitle showClose onClose={() => setDialog(null)}>{t.organizationDocuments.edit}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {dialog.entry.code} · {typeLabel(dialog.entry.organization_type)}
              </Typography>
              <Input label={t.organizationDocuments.nameLabel} value={label} onChange={(e) => setLabel(e.target.value.slice(0, 150))} autoFocus />
              <Input
                label={t.organizationDocuments.sortOrderLabel} type="number" value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              <Checkbox label={t.organizationDocuments.requiredLabel} checked={required} onChange={setRequired} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setDialog(null)}>{t.catalogs.actions.keep}</Button>
            <Button
              loading={save.isPending}
              disabled={!label.trim()}
              onClick={() =>
                save.mutate({
                  code: dialog.entry.code,
                  label: label.trim(),
                  is_required: required,
                  sort_order: Number(sortOrder) || 0,
                })
              }
            >
              {t.catalogs.actions.save}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {dialog?.type === 'deactivate' && (
        <Dialog open onClose={() => setDialog(null)} maxWidth="xs">
          <DialogTitle showClose onClose={() => setDialog(null)}>{t.organizationDocuments.deactivateTitle}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" fontWeight={600} mb={0.5}>{dialog.entry.label}</Typography>
            <Typography variant="body2" color="text.secondary">{t.organizationDocuments.deactivateMessage}</Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setDialog(null)}>{t.catalogs.actions.keep}</Button>
            <Button
              variant="destructive"
              loading={setActive.isPending}
              onClick={() => setActive.mutate({ code: dialog.entry.code, active: false })}
            >
              {t.catalogs.actions.deactivate}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}
