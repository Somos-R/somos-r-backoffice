import { apiClient, type RequestOptions } from '../lib/apiClient'

/** What a list needs to find and act on someone. */
export interface AdminUserSummary {
  id: string
  email: string
  full_name: string
  user_type_code: string
  role_code: string | null
  organization_id: string | null
  is_active: boolean
  verification_status: 'pending' | 'verified' | 'rejected' | null
  email_verified: boolean
  /** Temporarily blocked after failed sign-ins. */
  locked: boolean
  /** Invited (or verified) and has not chosen a password yet. */
  pending_activation: boolean
  created_at: string
}

export interface AdminUserListResponse {
  total: number
  limit: number
  offset: number
  items: AdminUserSummary[]
}

/** The full profile plus the security state of the account (opening it is audited by the server). */
export interface AdminUserDetail {
  id: string
  email: string
  full_name: string
  phone: string | null
  id_type: string
  id_number: string
  user_type_code: string
  role_code: string | null
  is_active: boolean
  email_verified_at: string | null
  pending_activation: boolean
  verification_status?: 'pending' | 'verified' | 'rejected' | null
  created_at: string
  updated_at: string
  locked: boolean
  locked_until: string | null
  failed_login_attempts: number
  mfa_enabled: boolean
  organization_name: string | null
}

export interface AdminUsersListParams {
  q?: string
  user_type_code?: string
  is_active?: boolean
  locked?: boolean
  pending_activation?: boolean
  limit?: number
  offset?: number
}

export const adminUsersService = {
  list: (params: AdminUsersListParams, options?: RequestOptions): Promise<AdminUserListResponse> =>
    apiClient.get('/admin/users', { params, signal: options?.signal }).then((r) => r.data),

  detail: (userId: string, options?: RequestOptions): Promise<AdminUserDetail> =>
    apiClient.get(`/admin/users/${userId}`, { signal: options?.signal }).then((r) => r.data),

  /** Deactivating also ends every session the account has. Not the caller's own account. */
  setActive: (userId: string, isActive: boolean, reason?: string): Promise<AdminUserSummary> =>
    apiClient.patch(`/admin/users/${userId}/status`, { is_active: isActive, ...(reason ? { reason } : {}) }).then((r) => r.data),

  /** Lifts the temporary block after failed sign-ins. */
  unlock: (userId: string): Promise<AdminUserSummary> =>
    apiClient.post(`/admin/users/${userId}/unlock`).then((r) => r.data),

  /** Signs the person out everywhere: every refresh token and every access token issued so far. */
  revokeSessions: (userId: string): Promise<AdminUserSummary> =>
    apiClient.post(`/admin/users/${userId}/sessions/revoke`).then((r) => r.data),

  /** A new activation link for someone invited (or a verified recycler) who hasn't set a password. */
  resendInvitation: (userId: string): Promise<AdminUserSummary> =>
    apiClient.post(`/admin/users/${userId}/invitation/resend`).then((r) => r.data),

  /** Another existing role for ECA or Association staff (it must fit their type). */
  changeRole: (userId: string, roleCode: string): Promise<AdminUserSummary> =>
    apiClient.patch(`/admin/users/${userId}/role`, { role_code: roleCode }).then((r) => r.data),
}
