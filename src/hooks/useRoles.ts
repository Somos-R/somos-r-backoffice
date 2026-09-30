import { useAuth } from './useAuth'
import { can, type Permission } from '../lib/permissions'

/**
 * Permission checks for the UI. Ask for a capability (`can('users.manage')`), never for a role
 * name: the server decides what each role may do and announces it in `GET /admin/me`.
 */
export function useRoles() {
  const { user } = useAuth()

  return {
    role: user?.role_code ?? null,
    can: (permission: Permission) => can(user, permission),
  }
}
