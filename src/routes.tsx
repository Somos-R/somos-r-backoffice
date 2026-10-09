import { ClipboardCheck, LayoutDashboard, ListChecks, ScrollText, Users as UsersIcon } from 'lucide-react'
import { Applications, Audit, Catalogs, Home, Users } from './lazyPages'
import { t } from './lib/i18n'
import type { Permission } from './lib/permissions'

export interface AppRoute {
  path: string
  /** Needed to open the page; the menu hides the entry without it and the route shows a 403. */
  permission: Permission
  label: string
  icon: React.ReactNode
  element: React.ReactNode
}

// Single source for both the menu and the router, so a page can't be reachable without going
// through its guard, nor listed in the menu without being routed.
export const APP_ROUTES: AppRoute[] = [
  { path: '/', permission: 'home.view', label: t.nav.home, icon: <LayoutDashboard size={20} />, element: <Home /> },
  { path: '/solicitudes', permission: 'organizations.review', label: t.nav.applications, icon: <ClipboardCheck size={20} />, element: <Applications /> },
  { path: '/usuarios', permission: 'users.manage', label: t.nav.users, icon: <UsersIcon size={20} />, element: <Users /> },
  { path: '/catalogos', permission: 'catalogs.manage', label: t.nav.catalogs, icon: <ListChecks size={20} />, element: <Catalogs /> },
  { path: '/auditoria', permission: 'audit.read', label: t.nav.audit, icon: <ScrollText size={20} />, element: <Audit /> },
]

/** First page the account may open: where a denied `/` sends someone. */
export function getHomePath(can: (permission: Permission) => boolean): string {
  return APP_ROUTES.find((route) => can(route.permission))?.path ?? '/'
}
