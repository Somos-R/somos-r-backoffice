import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { clearSession } from '../lib/session'
import { fakeJwt, mockAdapter } from './helpers'

// A small fake of the backend's /admin API: enough of the two-factor sign-in and the profile to
// walk the screens. Every request is recorded so tests can check what was sent.

export const PASSWORD = 'CorrectHorse-9'
export const GOOD_CODE = '123456'
export const GOOD_RECOVERY_CODE = 'ABCD-EFGH-1'
export const ENROLLMENT = { secret: 'JBSWY3DPEHPK3PXP', otpauth_uri: 'otpauth://totp/Somos%20R:ana@somosr.co?secret=JBSWY3DPEHPK3PXP&issuer=Somos%20R' }
export const RECOVERY_CODES = ['AAAA-1111', 'BBBB-2222', 'CCCC-3333', 'DDDD-4444']

export interface Recorded { method: string; url: string; body: unknown }

export interface AdminApiOptions {
  /** First sign-in: the account has no authenticator yet. */
  enrollment?: boolean
  capabilities?: string[]
  recoveryCodesRemaining?: number
  /** Makes the second factor answer "attempt expired". */
  expireMfa?: boolean
  /** Makes GET /admin/me fail with this status. */
  meStatus?: number
}

const PROFILE = { id: 'p1', email: 'ana@somosr.co', full_name: 'Ana Plataforma', role_code: 'platform_admin', mfa_enabled: true }

export function serveAdminApi(options: AdminApiOptions = {}) {
  const requests: Recorded[] = []
  const session = (extra: object = {}) => ({
    access_token: fakeJwt({ sub: 'p1' }), refresh_token: 'refresh-1', token_type: 'bearer', expires_in: 900, ...extra,
  })
  const expired = { status: 401, data: { detail: 'expired', code: 'mfa_session_expired' } }
  const wrongCode = { status: 401, data: { detail: 'bad', code: 'invalid_mfa_code' } }

  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const method = String(c.method).toUpperCase()
    const body = c.data ? JSON.parse(c.data) : undefined
    requests.push({ method, url, body })

    if (url === '/admin/auth/login') {
      if (body.password !== PASSWORD) return { status: 401, data: { detail: 'x', code: 'invalid_credentials' } }
      return { data: { mfa_token: 'mfa-1', mfa_status: options.enrollment ? 'enrollment_required' : 'code_required', expires_in: 300 } }
    }
    if (url === '/admin/auth/mfa/enroll') return options.expireMfa ? expired : { data: ENROLLMENT }
    if (url === '/admin/auth/mfa/enroll/confirm') {
      if (options.expireMfa) return expired
      return body.code === GOOD_CODE ? { data: session({ recovery_codes: RECOVERY_CODES }) } : wrongCode
    }
    if (url === '/admin/auth/mfa/verify') {
      if (options.expireMfa) return expired
      if (body.code === GOOD_CODE) return { data: session() }
      if (body.recovery_code === GOOD_RECOVERY_CODE) return { data: session({ recovery_codes_remaining: 2 }) }
      return wrongCode
    }
    if (url === '/admin/me') {
      if (options.meStatus) return { status: options.meStatus, data: { detail: 'x', code: 'admin_network_denied' } }
      return {
        data: {
          ...PROFILE,
          capabilities: options.capabilities ?? ['organizations.review', 'users.manage', 'catalogs.manage', 'audit.read'],
          recovery_codes_remaining: options.recoveryCodesRemaining ?? 8,
        },
      }
    }
    if (url === '/admin/auth/logout') return { data: { message: 'ok' } }
    return { data: {} }
  })
  return { requests, sent: (url: string) => requests.filter((r) => r.url === url) }
}

export function renderAt(path: string) {
  window.history.pushState({}, '', path)
  clearSession()
  queryClient.clear()
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}
