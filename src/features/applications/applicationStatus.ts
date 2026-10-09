import { t } from '../../lib/i18n'
import type { ApplicationStatus } from '../../services/applications'

/** Everything a status filter can ask for; "no filter" is the open queue. */
export const STATUS_FILTERS: ApplicationStatus[] = ['submitted', 'in_review', 'changes_requested', 'approved', 'rejected']

export const STATUS_COLOR: Record<ApplicationStatus, 'warning' | 'info' | 'default' | 'success' | 'error'> = {
  submitted: 'warning',
  in_review: 'info',
  changes_requested: 'default',
  approved: 'success',
  rejected: 'error',
}

/** A status this build doesn't know yet shows as its raw code instead of disappearing. */
export const statusLabel = (status: string): string => (t.applications.status as Record<string, string>)[status] ?? status
export const typeLabel = (type: string): string => (t.applications.types as Record<string, string>)[type] ?? type

/** Only these can be taken or decided; the server answers `application_not_reviewable` otherwise. */
export const isReviewable = (status: string): boolean => status === 'submitted' || status === 'in_review'

/** The summary the server demands to ask for changes or to reject. */
export const MIN_SUMMARY_LENGTH = 10
export const MAX_SUMMARY_LENGTH = 1000

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
