import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormDrawer, Input, Loader,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, type FormFieldDef,
} from '../../components/ui'
import { adminCatalogQueries } from '../../queries/adminCatalogs'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { adminCatalogsService, type AdminCatalogEntry, type CatalogKind } from '../../services/adminCatalogs'
import { getApiErrorMessage } from '../../lib/apiError'
import { t, interpolate } from '../../lib/i18n'

// The formats the server enforces (and answers 422 `invalid_code` for): checked here too so the
// operator finds out before sending.
const CODE_PATTERN: Record<CatalogKind, RegExp> = {
  materials: /^[a-z][a-z0-9_]{1,29}$/,
  'document-types': /^[A-Z][A-Z0-9]{1,9}$/,
}

const COPY: Record<CatalogKind, typeof t.catalogs.materials> = {
  materials: t.catalogs.materials,
  'document-types': t.catalogs.documentTypes,
}

interface Props {
  kind: CatalogKind
  /** The page shows the result (success or the translated failure) in its snackbar. */
  onNotify: (message: string, severity: 'success' | 'error') => void
}

type Modal = { type: 'edit' | 'deactivate'; entry: AdminCatalogEntry } | null

/** One catalog: its entries (active or not), add, rename, and deactivate/reactivate. Nothing is deleted. */
export default function CatalogSection({ kind, onNotify }: Props) {
  const queryClient = useQueryClient()
  const copy = COPY[kind]
  const { data: entries = [], isLoading } = useQuery(adminCatalogQueries.list(kind))

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialog, setDialog] = useState<Modal>(null)
  const [name, setName] = useState('')
  const [busyCode, setBusyCode] = useState<string | null>(null)

  // Every action reports its own result, and a failure reloads the list too (someone else may
  // have changed the entry), so no global notice.
  const useAction = <V,>(mutationFn: (v: V) => Promise<AdminCatalogEntry>, success: (entry: AdminCatalogEntry, v: V) => string) =>
    useMutation({
      meta: { silent: true, refreshOnError: AFFECTED.catalogChanged },
      mutationFn,
      onSuccess: (entry, variables) => {
        invalidateAffected(queryClient, AFFECTED.catalogChanged)
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
    (v: { code: string; label: string }) => adminCatalogsService.create(kind, v),
    (entry) => interpolate(t.catalogs.messages.created, { name: entry.label }),
  )
  const rename = useAction(
    (v: { code: string; label: string }) => adminCatalogsService.update(kind, v.code, { label: v.label }),
    (entry) => interpolate(t.catalogs.messages.renamed, { name: entry.label }),
  )
  const setActive = useAction(
    (v: { code: string; active: boolean }) => {
      setBusyCode(v.code)
      return adminCatalogsService.update(kind, v.code, { is_active: v.active })
    },
    (entry, v) => interpolate(v.active ? t.catalogs.messages.reactivated : t.catalogs.messages.deactivated, { name: entry.label }),
  )

  const fields: FormFieldDef[] = [
    {
      name: 'code', label: copy.codeLabel, type: 'text', required: true,
      validate: (v) => (CODE_PATTERN[kind].test(v.trim()) ? undefined : copy.codeFormat),
    },
    { name: 'label', label: copy.nameLabel, type: 'text', required: true },
  ]

  const openEdit = (entry: AdminCatalogEntry) => { setName(entry.label); setDialog({ type: 'edit', entry }) }

  return (
    <Box component="section" aria-label={copy.title} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={600}>{copy.title}</Typography>
        <Button size="small" startIcon={<Plus size={16} />} onClick={() => setDrawerOpen(true)}>{copy.add}</Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>
      ) : entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{t.catalogs.empty}</Typography>
      ) : (
        <TableContainer>
          <Table aria-label={copy.title}>
            <TableHead>
              <TableRow>
                <TableCell>{t.catalogs.table.code}</TableCell>
                <TableCell>{t.catalogs.table.name}</TableCell>
                {kind === 'materials' && <TableCell>{t.catalogs.table.unit}</TableCell>}
                <TableCell>{t.catalogs.table.status}</TableCell>
                <TableCell>{t.catalogs.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.code} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{entry.code}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{entry.label}</TableCell>
                  {kind === 'materials' && <TableCell>{entry.unit ?? '—'}</TableCell>}
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
        title={copy.drawerTitle}
        fields={fields}
        isSubmitting={create.isPending}
        onSubmit={(values) => create.mutate({ code: values.code.trim(), label: values.label.trim() })}
      />

      {dialog?.type === 'edit' && (
        <Dialog open onClose={() => setDialog(null)} maxWidth="xs">
          <DialogTitle showClose onClose={() => setDialog(null)}>{copy.edit}</DialogTitle>
          <DialogContent>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }} component="p" mb={1.5}>
              {dialog.entry.code}
            </Typography>
            <Input label={copy.nameLabel} value={name} onChange={(e) => setName(e.target.value.slice(0, 100))} autoFocus />
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setDialog(null)}>{t.catalogs.actions.keep}</Button>
            <Button
              loading={rename.isPending}
              disabled={!name.trim() || name.trim() === dialog.entry.label}
              onClick={() => rename.mutate({ code: dialog.entry.code, label: name.trim() })}
            >
              {t.catalogs.actions.save}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {dialog?.type === 'deactivate' && (
        <Dialog open onClose={() => setDialog(null)} maxWidth="xs">
          <DialogTitle showClose onClose={() => setDialog(null)}>{copy.deactivateTitle}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" fontWeight={600} mb={0.5}>{dialog.entry.label}</Typography>
            <Typography variant="body2" color="text.secondary">{copy.deactivateMessage}</Typography>
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
