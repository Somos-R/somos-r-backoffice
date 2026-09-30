import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { MutationObserver, type QueryKey } from '@tanstack/react-query'
import { ME_QUERY_KEY, queryClient } from '../queryClient'
import { dismissNotification, getNotification, notify, resetNotifier } from '../notifier'
import { t } from '../i18n'

const failure = (status: number, detail?: unknown) => ({ response: { status, data: detail === undefined ? {} : { detail }, headers: {} } })

const failMutation = (error: unknown, meta?: { silent?: boolean; refreshOnError?: QueryKey[] }) =>
  new MutationObserver(queryClient, {
    mutationFn: () => Promise.reject(error),
    meta,
  }).mutate().catch(() => undefined)

const failQuery = (error: unknown, key: QueryKey = ['things'], meta?: { silent?: boolean }) =>
  queryClient.fetchQuery({ queryKey: key, queryFn: () => Promise.reject(error), retry: false, meta }).catch(() => undefined)

describe('global mutation errors', () => {
  beforeEach(() => {
    queryClient.clear()
    resetNotifier()
  })

  it('shows the server message for a business error (e.g. an unverified recycler)', async () => {
    await failMutation(failure(400, 'El reciclador no está verificado o su cuenta está desactivada'))
    expect(getNotification()).toMatchObject({
      message: 'El reciclador no está verificado o su cuenta está desactivada',
      severity: 'error',
    })
  })

  it('uses a friendly text for 5xx instead of whatever the server said', async () => {
    await failMutation(failure(500, 'Traceback: something internal'))
    expect(getNotification()?.message).toBe(t.errors.server)
  })

  it('reports connection problems', async () => {
    await failMutation(new Error('Network Error'))
    expect(getNotification()?.message).toBe(t.errors.network)
  })

  it('uses a generic text when a 4xx carries no message, and a permission text for a bare 403', async () => {
    await failMutation(failure(409))
    expect(getNotification()?.message).toBe(t.errors.generic)
    resetNotifier()
    await failMutation(failure(403))
    expect(getNotification()?.message).toBe(t.errors.forbidden)
  })

  it('stays quiet for 401: the session layer refreshes or ends the session', async () => {
    await failMutation(failure(401))
    expect(getNotification()).toBeNull()
  })

  it('stays quiet for mutations that render their own error', async () => {
    await failMutation(failure(400, 'algo'), { silent: true })
    expect(getNotification()).toBeNull()
  })

  it('reloads the listed queries when an action fails, even a silent one', async () => {
    queryClient.setQueryData(['weighings'], { items: [] })
    queryClient.setQueryData(['inventory'], { items: [] })
    await failMutation(failure(400, 'ya validado'), { silent: true, refreshOnError: [['weighings']] })
    expect(queryClient.getQueryState(['weighings'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['inventory'])?.isInvalidated).toBe(false)
  })
})

describe('global query errors', () => {
  beforeEach(() => {
    queryClient.clear()
    resetNotifier()
  })

  it('notifies when a screen fails to load for the first time', async () => {
    await failQuery(failure(500))
    expect(getNotification()?.message).toBe(t.errors.server)
  })

  it('does not nag when a background refetch fails and the user already has data', async () => {
    queryClient.setQueryData(['things'], { ok: true })
    await queryClient.fetchQuery({ queryKey: ['things'], queryFn: () => Promise.reject(failure(500)), retry: false, staleTime: 0 }).catch(() => undefined)
    expect(getNotification()).toBeNull()
  })

  it('stays quiet for silent queries and for 401', async () => {
    await failQuery(failure(500), ['a'], { silent: true })
    await failQuery(failure(401), ['b'])
    expect(getNotification()).toBeNull()
  })
})

describe('403 handling', () => {
  let invalidate: MockInstance<typeof queryClient.invalidateQueries>

  beforeEach(() => {
    queryClient.clear()
    resetNotifier()
    invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  })
  afterEach(() => invalidate.mockRestore())

  const profileReloads = () => invalidate.mock.calls.filter(([filters]) => filters?.queryKey?.[0] === ME_QUERY_KEY[0])

  it('reloads the profile after a 403, since the role may have changed', async () => {
    await failMutation(failure(403, 'No tienes permisos para realizar esta acción'))
    expect(profileReloads()).toHaveLength(1)
    expect(getNotification()?.message).toBe('No tienes permisos para realizar esta acción')
  })

  it('does not reload the profile when the profile request itself is refused (no loop)', async () => {
    await failQuery(failure(403), [...ME_QUERY_KEY])
    expect(profileReloads()).toHaveLength(0)
  })

  it('does not reload the profile for other errors', async () => {
    await failMutation(failure(400, 'x'))
    await failMutation(failure(500))
    expect(profileReloads()).toHaveLength(0)
  })
})

describe('notifier', () => {
  beforeEach(() => resetNotifier())

  it('drops an identical message shown within a few seconds', () => {
    notify('Algo pasó')
    const first = getNotification()
    notify('Algo pasó')
    expect(getNotification()?.id).toBe(first?.id)
  })

  it('shows a different message right away, replacing the previous one', () => {
    notify('Uno')
    notify('Dos')
    expect(getNotification()?.message).toBe('Dos')
  })

  it('can be dismissed and shown again afterwards', () => {
    notify('Uno')
    dismissNotification()
    expect(getNotification()).toBeNull()
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 10_000)
    notify('Uno')
    vi.useRealTimers()
    expect(getNotification()?.message).toBe('Uno')
  })
})
