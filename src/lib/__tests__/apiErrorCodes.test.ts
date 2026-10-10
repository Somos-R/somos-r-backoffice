import { describe, expect, it } from 'vitest'
import { getApiErrorMessage, getErrorCode, translateErrorCode } from '../apiError'
import { t } from '../i18n'

const failure = (status: number, data: Record<string, unknown> = {}, headers: Record<string, unknown> = {}) => ({
  response: { status, data, headers },
})

// Every error code the backoffice can meet (backend: /admin/*, tokens and network guard). When the
// backend adds one, add it here and to es.json: this test is the reminder.
const BACKEND_CODES = [
  'invalid_credentials', 'invalid_token', 'session_closed', 'session_outdated', 'account_disabled',
  'invalid_refresh_token', 'unauthorized', 'forbidden', 'not_found', 'user_not_found', 'method_not_allowed',
  'internal_error',
  'invalid_mfa_code', 'mfa_session_expired', 'mfa_already_enrolled', 'mfa_not_started', 'mfa_not_enrolled',
  'cannot_reset_own_mfa', 'admin_network_denied',
  'cannot_change_own_status', 'role_not_editable', 'organization_not_applicable', 'already_in_organization',
  'organization_not_found', 'organization_type_mismatch', 'organization_not_active', 'no_organization',
  'not_verified', 'invitation_not_pending', 'invalid_role', 'already_in_review', 'application_not_reviewable', 'applicant_account_conflict',
  'organization_already_registered', 'documents_not_approved', 'registration_closed', 'code_already_exists', 'invalid_code',
]

describe('error code dictionary', () => {
  it.each(BACKEND_CODES)('%s has a Spanish message', (code) => {
    const message = translateErrorCode(code)
    expect(message).toBeTruthy()
    expect(message).not.toBe(code)
    expect(message).not.toMatch(/_/)
  })

  it('does not resolve codes through Object.prototype', () => {
    for (const code of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(translateErrorCode(code)).toBeUndefined()
    }
  })
})

describe('getApiErrorMessage', () => {
  it('prefers the translation of the stable code over the server wording', () => {
    const error = failure(401, { detail: 'Invalid code', code: 'invalid_mfa_code' })
    expect(getErrorCode(error)).toBe('invalid_mfa_code')
    expect(getApiErrorMessage(error, 'fallback')).toBe(t.apiErrors.invalid_mfa_code)
  })

  it('falls back to the detail, then to the caller text, for codes this build does not know', () => {
    expect(getApiErrorMessage(failure(400, { detail: 'Algo pasó', code: 'brand_new' }), 'fallback')).toBe('Algo pasó')
    expect(getApiErrorMessage(failure(400, { code: 'brand_new' }), 'fallback')).toBe('fallback')
  })

  it('reports a network failure when there is no response', () => {
    expect(getApiErrorMessage({}, 'fallback')).toBe(t.errors.network)
  })
})
