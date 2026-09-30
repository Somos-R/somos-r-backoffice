import { apiClient, type RequestOptions } from '../lib/apiClient'

/** One recorded event. Append-only on the server: it can be read, never changed. */
export interface AuditEvent {
  id: string
  occurred_at: string
  /** `<subject>.<what happened>`, e.g. `user.deactivated`. */
  action: string
  outcome: 'success' | 'failure' | string
  actor_id: string | null
  actor_role: string | null
  target_type: string | null
  target_id: string | null
  ip: string | null
  /** The same `X-Request-ID` as the server logs. */
  request_id: string | null
  /** Event-specific data (the previous and new role...). Never passwords, tokens or hashes. */
  details: Record<string, unknown>
}

export interface AuditListResponse {
  total: number
  limit: number
  offset: number
  items: AuditEvent[]
}

export interface AuditListParams {
  action?: string
  outcome?: string
  actor_id?: string
  actor_role?: string
  organization_id?: string
  target_type?: string
  target_id?: string
  request_id?: string
  /** ISO 8601 */
  since?: string
  until?: string
  limit?: number
  offset?: number
}

export const adminAuditService = {
  /**
   * The whole trail, newest first. Every read is itself recorded by the server (`admin.audit_viewed`,
   * with the names of the filters used), so callers should not fire it on every keystroke.
   */
  list: (params: AuditListParams, options?: RequestOptions): Promise<AuditListResponse> =>
    apiClient.get('/admin/audit-log', { params, signal: options?.signal }).then((r) => r.data),
}
