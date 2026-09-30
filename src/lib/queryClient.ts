import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query'
import { getApiErrorMessage, isCancelError, isTimeoutError } from './apiError'
import { t } from './i18n'
import { notify } from './notifier'
import { queryKeys } from '../queries/keys'
import { getAccessToken, subscribe } from './session'

/** React Query key of the signed-in user's profile. */
export const ME_QUERY_KEY = queryKeys.me

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /** The caller renders this failure itself; don't raise a global notification. */
      silent?: boolean
    }
    mutationMeta: {
      /** The caller shows its own message (inline error, dialog, snackbar). */
      silent?: boolean
      /** Queries to reload when the action fails: it usually means the data on screen is stale. */
      refreshOnError?: readonly QueryKey[]
    }
  }
}

const MAX_RETRIES = 2

// Retrying a 4xx (bad request, 401, 403, 404, 409) never helps and only delays the error;
// only network failures and 5xx responses are worth a second attempt.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  // The user left the screen: nothing to retry.
  if (isCancelError(error)) return false
  // A timeout can burn the whole request timeout on every attempt, so allow one more try only.
  if (isTimeoutError(error)) return failureCount < 1
  const status = statusOf(error)
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < MAX_RETRIES
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

/** Text for the global notification, or null when this failure should not raise one. */
function messageFor(error: unknown): string | null {
  if (isCancelError(error)) return null // aborted on purpose, e.g. the user navigated away
  const status = statusOf(error)
  if (status === 401) return null // the session layer refreshes or ends the session
  if (status !== undefined && status >= 500) return t.errors.server
  return getApiErrorMessage(error, status === 403 ? t.errors.forbidden : t.errors.generic)
}

// A 403 can mean the user's role changed after the profile was loaded: reload it so menus and
// buttons match what the server now allows. Never for the profile query itself (that would loop).
function refreshProfileOn403(error: unknown, queryKey?: QueryKey) {
  if (statusOf(error) !== 403) return
  if (queryKey && queryKey[0] === ME_QUERY_KEY[0]) return
  void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
}

const queryCache = new QueryCache({
  onError: (error, query) => {
    if (query.meta?.silent) return
    // Only the first failure of a screen: a background refetch failing must not nag the user
    // while they still see the data they already have.
    if (query.state.data !== undefined) return
    const message = messageFor(error)
    if (message) notify(message)
    refreshProfileOn403(error, query.queryKey)
  },
})

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    const meta = mutation.meta
    // Stale screen after a failed action (someone else validated it, stock ran out...).
    meta?.refreshOnError?.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
    refreshProfileOn403(error)
    if (meta?.silent) return
    const message = messageFor(error)
    if (message) notify(message)
  },
})

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
    },
  },
})

// Cached server data belongs to the user who fetched it: when the session ends (logout,
// expired refresh token, logout in another tab) wipe it so the next user never sees it.
subscribe(() => {
  if (getAccessToken() === null) queryClient.clear()
})
