import { useState } from 'react'
import Box from '@mui/material/Box'
import { Button, Input, Select } from '../../components/ui'
import { t } from '../../lib/i18n'
import { ACTION_CODES, EMPTY_FILTERS, actionLabel, hasAdvancedFilters, type AuditFilterValues } from './auditHelpers'

interface Props {
  /** What is applied right now (the form starts from it). */
  applied: AuditFilterValues
  onApply: (filters: AuditFilterValues) => void
  onClear: () => void
}

/**
 * Filters are applied with a button, not as the person types: every read of the trail is recorded by
 * the server (with the names of the filters used), so one request per keystroke would fill the
 * trail with the act of looking at it.
 */
export function AuditFilters({ applied, onApply, onClear }: Props) {
  const [draft, setDraft] = useState<AuditFilterValues>(applied)
  const [showMore, setShowMore] = useState(hasAdvancedFilters(applied))

  const set = (key: keyof AuditFilterValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }))

  const badRange = Boolean(draft.since && draft.until && draft.since > draft.until)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (badRange) return
    onApply(draft)
  }

  const clear = () => {
    setDraft(EMPTY_FILTERS)
    onClear()
  }

  return (
    <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Select
          label={t.audit.filters.action}
          value={draft.action}
          onChange={set('action')}
          options={[{ value: '', label: t.audit.filters.allActions }, ...ACTION_CODES.map((code) => ({ value: code, label: actionLabel(code) }))]}
          fullWidth={false}
          sx={{ minWidth: 280 }}
        />
        <Select
          label={t.audit.filters.outcome}
          value={draft.outcome}
          onChange={set('outcome')}
          options={[
            { value: '', label: t.audit.filters.allOutcomes },
            { value: 'success', label: t.audit.outcome.success },
            { value: 'failure', label: t.audit.outcome.failure },
          ]}
          fullWidth={false}
          sx={{ minWidth: 190 }}
        />
        <Input label={t.audit.filters.since} type="date" value={draft.since} onChange={set('since')} fullWidth={false} error={badRange} />
        <Input
          label={t.audit.filters.until}
          type="date"
          value={draft.until}
          onChange={set('until')}
          fullWidth={false}
          error={badRange}
          helperText={badRange ? t.audit.filters.invalidRange : undefined}
        />
      </Box>

      {showMore && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Input label={t.audit.filters.actorId} value={draft.actorId} onChange={set('actorId')} />
          <Input label={t.audit.filters.actorRole} value={draft.actorRole} onChange={set('actorRole')} />
          <Input label={t.audit.filters.organizationId} value={draft.organizationId} onChange={set('organizationId')} />
          <Input label={t.audit.filters.targetType} value={draft.targetType} onChange={set('targetType')} />
          <Input label={t.audit.filters.targetId} value={draft.targetId} onChange={set('targetId')} />
          <Input label={t.audit.filters.requestId} value={draft.requestId} onChange={set('requestId')} />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button type="submit" disabled={badRange}>{t.audit.filters.apply}</Button>
        <Button variant="outlined" onClick={clear}>{t.audit.filters.clear}</Button>
        <Button variant="text" onClick={() => setShowMore((v) => !v)}>
          {showMore ? t.audit.filters.less : t.audit.filters.more}
        </Button>
      </Box>
    </Box>
  )
}
