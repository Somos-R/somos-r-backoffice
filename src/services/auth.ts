import { apiClient, type RequestOptions } from '../lib/apiClient'
import { clearSession, type SessionTokens } from '../lib/session'
import type { AdminUser } from '../types/auth.types'

/** Password accepted; a second factor is still needed to open the session. */
export interface MfaChallenge {
  /** Short-lived token to present with the second factor. */
  mfa_token: string
  /** `enrollment_required` on the very first sign-in: the authenticator app must be set up first. */
  mfa_status: 'code_required' | 'enrollment_required'
  /** Seconds left to complete the second factor. */
  expires_in: number
}

export interface MfaEnrollment {
  /** Base32 secret, for typing into an authenticator app by hand. */
  secret: string
  /** What the screen draws as a QR code. */
  otpauth_uri: string
}

export interface BackofficeSession extends SessionTokens {
  token_type: string
  expires_in: number
  /** Only at enrollment, and shown once: they replace the authenticator if it is lost. */
  recovery_codes?: string[] | null
  /** Present when a recovery code was used to sign in. */
  recovery_codes_remaining?: number | null
}

// Every call here is part of signing in: a 401 means "wrong password/code", not "expired access
// token", so none of them may trigger a token refresh.
const noRefresh = { skipAuthRefresh: true } as const

export const adminAuthService = {
  /** Step 1: email and password. */
  async login(email: string, password: string): Promise<MfaChallenge> {
    const { data } = await apiClient.post<MfaChallenge>('/admin/auth/login', { email, password }, noRefresh)
    return data
  },

  /** First sign-in only: the secret to load into an authenticator app. */
  async startEnrollment(mfaToken: string): Promise<MfaEnrollment> {
    const { data } = await apiClient.post<MfaEnrollment>('/admin/auth/mfa/enroll', { mfa_token: mfaToken }, noRefresh)
    return data
  },

  /** Proves the authenticator works; opens the session and hands out the recovery codes. */
  async confirmEnrollment(mfaToken: string, code: string): Promise<BackofficeSession> {
    const { data } = await apiClient.post<BackofficeSession>(
      '/admin/auth/mfa/enroll/confirm',
      { mfa_token: mfaToken, code },
      noRefresh,
    )
    return data
  },

  /** Step 2: the authenticator's 6-digit code, or one recovery code. Opens the session. */
  async verify(mfaToken: string, credential: { code: string } | { recoveryCode: string }): Promise<BackofficeSession> {
    const body =
      'code' in credential
        ? { mfa_token: mfaToken, code: credential.code }
        : { mfa_token: mfaToken, recovery_code: credential.recoveryCode }
    const { data } = await apiClient.post<BackofficeSession>('/admin/auth/mfa/verify', body, noRefresh)
    return data
  },

  async me(options?: RequestOptions): Promise<AdminUser> {
    const { data } = await apiClient.get<AdminUser>('/admin/me', { signal: options?.signal })
    return data
  },

  async logout(): Promise<void> {
    try {
      // NOT skipAuthRefresh: if the access token already expired, refresh first so the refresh
      // token is revoked too instead of staying valid after "logout".
      await apiClient.post('/admin/auth/logout')
    } catch {
      // Expired token or network error: proceed with local cleanup anyway.
    }
    clearSession()
  },
}
