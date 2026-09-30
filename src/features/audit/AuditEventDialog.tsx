import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '../../components/ui'
import { t } from '../../lib/i18n'
import type { AuditEvent } from '../../services/audit'
import { actionLabel, formatWhen } from './auditHelpers'

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="dt">{label}</Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, wordBreak: 'break-all', fontFamily: mono ? 'monospace' : undefined }}>
        {children}
      </Typography>
    </Box>
  )
}

interface Props {
  event: AuditEvent
  roleLabels: Record<string, string>
  onClose: () => void
}

/** Everything the server recorded about one event. Already in the list, so it needs no request. */
export default function AuditEventDialog({ event, roleLabels, onClose }: Props) {
  const none = t.audit.detail.none
  const hasDetails = Object.keys(event.details ?? {}).length > 0

  return (
    <Dialog open onClose={onClose} maxWidth="sm">
      <DialogTitle showClose onClose={onClose}>{actionLabel(event.action)}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Badge
              label={event.outcome === 'success' ? t.audit.outcome.success : event.outcome === 'failure' ? t.audit.outcome.failure : event.outcome}
              color={event.outcome === 'success' ? 'success' : 'error'}
            />
          </Box>

          <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Field label={t.audit.detail.when}>{formatWhen(event.occurred_at)}</Field>
            <Field label={t.audit.detail.action} mono>{event.action}</Field>
            <Field label={t.audit.detail.actor} mono>{event.actor_id ?? t.audit.system}</Field>
            <Field label={t.audit.detail.actorRole}>{(event.actor_role && roleLabels[event.actor_role]) || event.actor_role || none}</Field>
            <Field label={t.audit.detail.target} mono>{event.target_type ? `${event.target_type}${event.target_id ? ` · ${event.target_id}` : ''}` : none}</Field>
            <Field label={t.audit.detail.ip} mono>{event.ip ?? none}</Field>
            <Field label={t.audit.detail.requestId} mono>{event.request_id ?? none}</Field>
            <Field label={t.audit.detail.id} mono>{event.id}</Field>
          </Box>

          <Box component="section" aria-labelledby="audit-details">
            <Typography id="audit-details" variant="subtitle2" component="h2" fontWeight={600} mb={1}>{t.audit.detail.details}</Typography>
            {hasDetails ? (
              // Rendered as text: the server's data is shown, never interpreted.
              <Box component="pre" tabIndex={0} sx={{ m: 0, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.8rem', overflow: 'auto', maxHeight: 240 }}>
                {JSON.stringify(event.details, null, 2)}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">{t.audit.detail.noDetails}</Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>{t.audit.detail.closeButton}</Button>
      </DialogActions>
    </Dialog>
  )
}
