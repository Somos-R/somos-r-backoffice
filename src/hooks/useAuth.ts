import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminAuthService } from '../services/auth'
import { queryKeys } from '../queries/keys'
import { getAccessToken, setTokens, subscribe, type SessionTokens } from '../lib/session'

const ME_STALE_TIME = 5 * 60_000

const useHasSession = () => useSyncExternalStore(subscribe, () => getAccessToken() !== null)

/**
 * The session (tokens) lives in lib/session; the account profile is server data, so it lives in
 * React Query under ['me']. Components read both through this hook.
 */
export function useAuth() {
  const isAuthenticated = useHasSession()

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => adminAuthService.me({ signal }),
    enabled: isAuthenticated,
    staleTime: ME_STALE_TIME,
    meta: { silent: true }, // App shows its own retry / logout screen
  })

  return {
    user: isAuthenticated ? (me.data ?? null) : null,
    isAuthenticated,
    isUserLoading: isAuthenticated && me.isPending,
    userError: isAuthenticated && me.isError,
    retryUser: () => me.refetch(),
    /** Opens the session once both factors are done (the screens hold the tokens until then). */
    signIn: (tokens: SessionTokens) => setTokens(tokens),
    logout: adminAuthService.logout,
  }
}
