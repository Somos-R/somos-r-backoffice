import { t } from '../../lib/i18n'
import type { ApplicationStatus, DocumentSlot, DocumentStatus } from '../../services/applications'

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

export const DOCUMENT_COLOR: Record<DocumentStatus, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  ok: 'success',
  missing: 'error',
  not_compliant: 'error',
}

export const documentStatusLabel = (status: string): string => (t.applications.documents.status as Record<string, string>)[status] ?? status

/** The comment the applicant reads when a document is not accepted. */
export const MAX_COMMENT_LENGTH = 500

/** Required documents that are not approved yet: the server refuses to approve the application while any remains. */
export const unapprovedRequired = (slots: DocumentSlot[]): DocumentSlot[] =>
  slots.filter((slot) => slot.document_type.is_required && slot.document?.status !== 'ok')

export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/** The summary the server demands to ask for changes or to reject. */
export const MIN_SUMMARY_LENGTH = 10
export const MAX_SUMMARY_LENGTH = 1000

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
