import { afterEach, describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { mockAdapter } from '../../test/helpers'
import { queryKeys } from '../keys'
import { AFFECTED } from '../invalidation'
import { usersQueries } from '../users'
import { auditQueries } from '../audit'
import { catalogQueries } from '../catalogs'
import { STALE_TIME } from '../config'

const page = { page: 0, rowsPerPage: 25 }
const original = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = original
})

function record() {
  const params: Record<string, unknown>[] = []
  apiClient.defaults.adapter = mockAdapter((c) => {
    params.push((c.params ?? {}) as Record<string, unknown>)
    return { data: { total: 0, items: [] } }
  })
  return params
}

describe('query keys', () => {
  it('keep every key under its resource root and never repeat one for different data', () => {
    const keys = [
      queryKeys.users.list({ userType: '', status: '', search: '', ...page }),
      queryKeys.users.list({ userType: 'eca', status: '', search: '', ...page }),
      queryKeys.users.list({ userType: '', status: 'locked', search: '', ...page }),
      queryKeys.users.list({ userType: '', status: '', search: 'ana', ...page }),
      queryKeys.users.list({ userType: '', status: '', search: '', page: 1, rowsPerPage: 25 }),
      queryKeys.users.detail('u1'),
      queryKeys.users.detail('u2'),
    ]
    expect(new Set(keys.map((k) => JSON.stringify(k))).size).toBe(keys.length)
    keys.forEach((k) => expect(k[0]).toBe('users'))
  })

  it('keeps catalogs out of the users root, and never invalidates them with a user action', () => {
    expect(queryKeys.catalogs.roles[0]).toBe('catalogs')
    for (const keys of Object.values(AFFECTED)) expect(keys.some((k) => (k[0] as string) === 'catalogs')).toBe(false)
    expect(AFFECTED.userChanged).toEqual([queryKeys.users.all])
  })
})

describe('users queries', () => {
  const fetchList = async (filters: Parameters<typeof usersQueries.list>[0]) => {
    const seen = record()
    await new QueryClient().fetchQuery(usersQueries.list(filters))
    return seen[0]
  }

  it('turn the page into limit/offset and leave empty filters out', async () => {
    const sent = await fetchList({ userType: '', status: '', search: '', page: 2, rowsPerPage: 25 })
    expect(sent).toEqual({ limit: 25, offset: 50 })
  })

  it('send the type and the text search', async () => {
    const sent = await fetchList({ userType: 'eca', status: '', search: ' Ana ', ...page })
    expect(sent).toMatchObject({ user_type_code: 'eca', q: 'Ana' })
  })

  it('do not send a search shorter than the server accepts', async () => {
    const sent = await fetchList({ userType: '', status: '', search: 'a', ...page })
    expect(sent.q).toBeUndefined()
  })

  it.each([
    ['active', { is_active: true }],
    ['inactive', { is_active: false }],
    ['locked', { locked: true }],
    ['pending', { pending_activation: true }],
  ])('map the %s state filter to what the server understands', async (status, expected) => {
    expect(await fetchList({ userType: '', status, search: '', ...page })).toMatchObject(expected)
  })

  it('never reuse an old detail: opening it is audited, so it is fetched every time', () => {
    expect(usersQueries.detail('u1').staleTime).toBe(0)
  })

  it('give the roles catalog a long staleTime', () => {
    expect(catalogQueries.roles().staleTime).toBe(STALE_TIME.catalog)
  })
})

describe('audit queries', () => {
  const emptyFilters = {
    action: '', outcome: '', actorId: '', actorRole: '', organizationId: '', targetType: '', targetId: '',
    requestId: '', since: '', until: '', page: 0, rowsPerPage: 25,
  }
  const fetchAudit = async (over: Partial<typeof emptyFilters>) => {
    const seen = record()
    await new QueryClient().fetchQuery(auditQueries.list({ ...emptyFilters, ...over }))
    return seen[0]
  }

  it('leave empty filters out instead of sending empty strings', async () => {
    expect(await fetchAudit({})).toEqual({ limit: 25, offset: 0 })
  })

  it('send every filter under the name the server expects', async () => {
    const sent = await fetchAudit({
      action: 'auth.login', outcome: 'failure', actorId: 'a1', actorRole: 'platform_admin', organizationId: 'o1',
      targetType: 'user', targetId: 't1', requestId: 'r1', since: '2026-01-01T00:00:00.000Z', until: '2026-01-02T00:00:00.000Z',
      page: 2,
    })
    expect(sent).toEqual({
      action: 'auth.login', outcome: 'failure', actor_id: 'a1', actor_role: 'platform_admin', organization_id: 'o1',
      target_type: 'user', target_id: 't1', request_id: 'r1', since: '2026-01-01T00:00:00.000Z',
      until: '2026-01-02T00:00:00.000Z', limit: 25, offset: 50,
    })
  })

  it('are never reloaded on their own: every read is recorded in the trail', () => {
    const options = auditQueries.list(emptyFilters)
    expect(options.refetchOnWindowFocus).toBe(false)
    expect(options.staleTime).toBeGreaterThanOrEqual(60_000)
  })

  it('keep their keys under the audit root, distinct per filter', () => {
    const a = queryKeys.audit.list(emptyFilters)
    const b = queryKeys.audit.list({ ...emptyFilters, action: 'auth.login' })
    expect(a[0]).toBe('audit')
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })
})
