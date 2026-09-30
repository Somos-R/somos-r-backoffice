/** The signed-in Somos R account (`GET /admin/me`). */
export interface AdminUser {
  id: string
  email: string
  full_name: string
  role_code: string | null
  /** What the server says this account may do (`users.manage`...). Empty without a role. */
  capabilities: string[]
  mfa_enabled: boolean
  /** How many one-time recovery codes are left for the second factor. */
  recovery_codes_remaining: number
}
