import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from './keys'

/**
 * What goes stale when something changes. One table for the whole app, used both after a successful
 * action (`invalidateAffected`) and when an action fails (`meta.refreshOnError`): if it failed, the
 * screen is probably showing outdated data of the same things.
 *
 * Catalogs never appear here: they don't change with any of these actions.
 */
export const AFFECTED = {
  /** An account was deactivated, unlocked, signed out, sent a new invitation or given another role. */
  userChanged: [queryKeys.users.all],
} as const satisfies Record<string, readonly QueryKey[]>

export function invalidateAffected(client: QueryClient, keys: readonly QueryKey[]) {
  keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))
}
