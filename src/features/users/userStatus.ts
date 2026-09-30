import { t } from '../../lib/i18n'
import type { AdminUserSummary } from '../../services/users'

export type UserStatus = 'active' | 'inactive' | 'locked' | 'pending'

export const USER_TYPES = ['citizen', 'building', 'recycler', 'eca', 'association', 'b2b_client', 'platform'] as const
export const STATUS_FILTERS = ['active', 'inactive', 'locked', 'pending'] as const

/** The states an account is in, most important first: a deactivated account is that above all. */
export function statusesOf(user: Pick<AdminUserSummary, 'is_active' | 'locked' | 'pending_activation'>): UserStatus[] {
  const states: UserStatus[] = []
  if (!user.is_active) states.push('inactive')
  if (user.locked) states.push('locked')
  if (user.pending_activation) states.push('pending')
  return states.length > 0 ? states : ['active']
}

export const typeLabel = (code: string): string => (t.users.types as Record<string, string>)[code] ?? code

/** Staff of an ECA or Association: the only accounts whose role can be changed from here. */
export const hasEditableRole = (userTypeCode: string): boolean => userTypeCode === 'eca' || userTypeCode === 'association'
