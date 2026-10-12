import { t } from '../../lib/i18n'
import type { LinkStatus, OrganizationStatus } from '../../services/organizations'

/** What the list can be filtered by (every stage of the onboarding). */
export const STATUS_FILTERS: OrganizationStatus[] = ['approved', 'submitted', 'in_review', 'changes_requested', 'rejected', 'draft', 'suspended']

export const STATUS_COLOR: Record<OrganizationStatus, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
  approved: 'success',
  submitted: 'warning',
  in_review: 'info',
  changes_requested: 'default',
  rejected: 'error',
  draft: 'default',
  suspended: 'error',
}

export const LINK_COLOR: Record<LinkStatus, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  requested: 'warning',
  rejected: 'error',
  removed: 'default',
}

// A value this build doesn't know yet shows as its raw code instead of disappearing.
export const statusLabel = (status: string): string => (t.organizations.status as Record<string, string>)[status] ?? status
export const linkLabel = (status: string): string => (t.organizations.linkStatus as Record<string, string>)[status] ?? status
export const typeLabel = (type: string): string => (t.organizations.types as Record<string, string>)[type] ?? type

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
