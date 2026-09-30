import { describe, expect, it } from 'vitest'
import { ACTION_CODES, actionLabel, endOfDayIso, hasAdvancedFilters, shortId, startOfDayIso, EMPTY_FILTERS } from '../auditHelpers'

// Every action the backend records (app/domains/audit/actions.py). When the backend adds one, add it
// here and to es.json: this test is the reminder that the filter and the list need its Spanish text.
const BACKEND_ACTIONS = [
  'user.registered', 'auth.login', 'auth.login_failed', 'auth.logout', 'auth.refresh_reuse_detected',
  'auth.refresh_denied', 'account.activated', 'email.verified', 'password.reset_requested', 'password.reset',
  'password.changed', 'password.change_failed', 'platform_admin.created',
  'admin.login', 'admin.login_failed', 'admin.logout', 'admin.mfa_enrolled', 'admin.mfa_failed',
  'admin.recovery_code_used', 'admin.recovery_codes_regenerated', 'admin.mfa_reset', 'admin.audit_viewed',
  'admin.user_viewed',
  'recycler.verified', 'recycler.rejected', 'user.updated', 'user.role_changed', 'user.invited',
  'user.invitation_resent', 'user.activated', 'user.deactivated', 'user.unlocked', 'user.sessions_revoked',
  'user.organization_assigned',
  'link.requested', 'link.accepted', 'link.rejected', 'link.removed',
  'weighing.created', 'weighing.validated', 'weighing.rejected', 'weighing.paid',
  'transaction.created', 'transaction.cancelled', 'transaction.delivered', 'transaction.paid',
  'inventory.updated',
]

describe('audit action texts', () => {
  it.each(BACKEND_ACTIONS)('%s has a Spanish text', (code) => {
    const label = actionLabel(code)
    expect(label).not.toBe(code)
    expect(label).not.toMatch(/[_.]/)
  })

  it('offers in the filter exactly the actions it knows', () => {
    expect([...ACTION_CODES].sort()).toEqual([...BACKEND_ACTIONS].sort())
  })

  it('shows an action it does not know as its code', () => {
    expect(actionLabel('brand.new_action')).toBe('brand.new_action')
  })

  it('does not resolve codes through Object.prototype', () => {
    expect(actionLabel('constructor')).toBe('constructor')
  })
})

describe('date filters', () => {
  it('start the day at local midnight and end it at its last millisecond', () => {
    expect(startOfDayIso('2026-01-05')).toBe(new Date('2026-01-05T00:00:00').toISOString())
    expect(endOfDayIso('2026-01-05')).toBe(new Date('2026-01-05T23:59:59.999').toISOString())
  })

  it('send nothing for an empty date', () => {
    expect(startOfDayIso('')).toBe('')
    expect(endOfDayIso('')).toBe('')
  })
})

describe('helpers', () => {
  it('knows when an advanced filter is set', () => {
    expect(hasAdvancedFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasAdvancedFilters({ ...EMPTY_FILTERS, requestId: 'r1' })).toBe(true)
    expect(hasAdvancedFilters({ ...EMPTY_FILTERS, action: 'auth.login' })).toBe(false) // a basic one
  })

  it('shortens an id to its first block', () => {
    expect(shortId('aaaaaaaa-bbbb-cccc')).toBe('aaaaaaaa')
  })
})
