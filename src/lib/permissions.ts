// What the UI may show. The list of capabilities comes from the server (`GET /admin/me`); the
// backend enforces every rule and answers 403 on its own, so this can hide a screen but never
// grant access.

/** Capabilities of Somos R's own roles, as the backend announces them. */
export type ServerPermission = 'organizations.review' | 'users.manage' | 'catalogs.manage' | 'audit.read'

/** Screen-level permissions that are not a server capability. */
export type UiPermission = 'home.view'

export type Permission = ServerPermission | UiPermission

interface Subject {
  capabilities: readonly string[]
}

export function can(subject: Subject | null | undefined, permission: Permission): boolean {
  if (!subject) return false
  // Every signed-in account can open the home screen.
  if (permission === 'home.view') return true
  return subject.capabilities.includes(permission)
}
