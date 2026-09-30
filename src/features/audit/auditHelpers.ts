import { t } from '../../lib/i18n'

/** The filters a person can set, as the form holds them (dates are `YYYY-MM-DD`, empty = no filter). */
export interface AuditFilterValues {
  action: string
  outcome: string
  since: string
  until: string
  actorId: string
  actorRole: string
  organizationId: string
  targetType: string
  targetId: string
  requestId: string
}

export const EMPTY_FILTERS: AuditFilterValues = {
  action: '',
  outcome: '',
  since: '',
  until: '',
  actorId: '',
  actorRole: '',
  organizationId: '',
  targetType: '',
  targetId: '',
  requestId: '',
}

/** The actions the backend records, in the order the filter offers them. */
export const ACTION_CODES = Object.keys(t.audit.actions)

/** Text for an action; a code this build doesn't know yet shows as it is instead of disappearing. */
export function actionLabel(code: string): string {
  const labels = t.audit.actions as Record<string, string>
  // hasOwn: a code like "constructor" must not resolve to something on Object.prototype.
  return Object.prototype.hasOwnProperty.call(labels, code) ? labels[code] : code
}

/** Local midnight at the start of the chosen day, as ISO 8601 (what the server filters on). */
export const startOfDayIso = (date: string): string => (date ? new Date(`${date}T00:00:00`).toISOString() : '')

/** The last millisecond of the chosen day, so "until" includes that whole day. */
export const endOfDayIso = (date: string): string => (date ? new Date(`${date}T23:59:59.999`).toISOString() : '')

/** Whether any of the more advanced filters is set (the panel then starts open). */
export const hasAdvancedFilters = (f: AuditFilterValues): boolean =>
  Boolean(f.actorId || f.actorRole || f.organizationId || f.targetType || f.targetId || f.requestId)

/** First block of an id: enough to tell two apart at a glance; the dialog has the whole value. */
export const shortId = (id: string): string => id.slice(0, 8)

export const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
