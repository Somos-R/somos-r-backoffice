/**
 * How long each kind of data counts as fresh (no refetch on mount / window focus while fresh).
 * The app-wide default (30 s, lib/queryClient) suits lists, which other people change. This is for
 * data that barely changes.
 */
export const STALE_TIME = {
  /** Roles: edited rarely, by a developer. */
  catalog: 10 * 60_000,
} as const

/** The server ignores text searches shorter than this, so a shorter one is not sent. */
export const MIN_SEARCH_LENGTH = 2
