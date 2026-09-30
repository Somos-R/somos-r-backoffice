import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../apiClient'
import { refreshClient } from '../tokenRefresh'
import { getAccessToken, getRefreshToken, setTokens } from '../session'
import { mockAdapter } from '../../test/helpers'
import { ME_QUERY_KEY, queryClient } from '../queryClient'

const bearer = (c: InternalAxiosRequestConfig) => String(c.headers.Authorization ?? '')

describe('apiClient token refresh', () => {
  let refreshCalls: number
  let refreshRequest: { url: string; body: unknown } | null
  let refreshReply: () => { status?: number; data?: unknown }

  beforeEach(() => {
    localStorage.clear()
    refreshCalls = 0
    refreshRequest = null
    refreshReply = () => ({ data: { access_token: 'new-access', refresh_token: 'new-refresh' } })
    refreshClient.defaults.adapter = mockAdapter((c) => {
      refreshCalls++
      refreshRequest = { url: String(c.url), body: JSON.parse(c.data) }
      return refreshReply()
    })
    // The API accepts only the fresh token; anything else counts as expired.
    apiClient.defaults.adapter = mockAdapter((c) =>
      bearer(c) === 'Bearer new-access' ? { data: { ok: true } } : { status: 401 },
    )
  })

  it('attaches the access token to requests', async () => {
    setTokens({ access_token: 'new-access', refresh_token: 'r' })
    const seen: string[] = []
    apiClient.defaults.adapter = mockAdapter((c) => {
      seen.push(bearer(c))
      return { data: {} }
    })
    await apiClient.get('/x')
    expect(seen).toEqual(['Bearer new-access'])
  })

  it('refreshes against the backoffice endpoint, not the portal one', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'old-refresh' })
    await apiClient.get('/admin/me')
    expect(refreshRequest).toEqual({ url: '/admin/auth/refresh', body: { refresh_token: 'old-refresh' } })
  })

  it('refreshes once on 401, stores the rotated tokens and replays the request', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'old-refresh' })
    const { data } = await apiClient.get('/users')
    expect(data).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
    expect(getAccessToken()).toBe('new-access')
    expect(getRefreshToken()).toBe('new-refresh')
  })

  it('marks the cached profile stale after a refresh so a changed role is picked up', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'old-refresh' })
    queryClient.setQueryData(ME_QUERY_KEY, { capabilities: [] })
    expect(queryClient.getQueryState(ME_QUERY_KEY)?.isInvalidated).toBe(false)
    await apiClient.get('/users')
    expect(queryClient.getQueryState(ME_QUERY_KEY)?.isInvalidated).toBe(true)
  })

  it('leaves the cached profile alone when the refresh fails', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'valid' })
    queryClient.setQueryData(ME_QUERY_KEY, { capabilities: [] })
    refreshReply = () => ({ status: 503 })
    await expect(apiClient.get('/users')).rejects.toBeTruthy()
    expect(queryClient.getQueryState(ME_QUERY_KEY)?.isInvalidated).toBe(false)
  })

  it('sends a single refresh for many parallel expired requests', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'old-refresh' })
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => apiClient.get(`/r/${i}`)))
    expect(results.every((r) => r.data.ok)).toBe(true)
    expect(refreshCalls).toBe(1)
  })

  it('does not refresh when another request already rotated the token', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'old-refresh' })
    // This request went out with the old token; the rotation lands before its 401 comes back.
    apiClient.defaults.adapter = mockAdapter((c) => {
      if (bearer(c) === 'Bearer expired') {
        setTokens({ access_token: 'new-access', refresh_token: 'new-refresh' })
        return { status: 401 }
      }
      return { data: { ok: true } }
    })
    await apiClient.get('/x')
    expect(refreshCalls).toBe(0)
  })

  it('clears the session when the refresh token is rejected', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'revoked' })
    refreshReply = () => ({ status: 401 })
    await expect(apiClient.get('/users')).rejects.toMatchObject({ response: { status: 401 } })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('keeps the session on a transient refresh failure', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'valid' })
    refreshReply = () => ({ status: 503 })
    await expect(apiClient.get('/users')).rejects.toBeTruthy()
    expect(getRefreshToken()).toBe('valid')
  })

  it('keeps the session when refresh is rate limited', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'valid' })
    refreshReply = () => ({ status: 429 })
    await expect(apiClient.get('/users')).rejects.toBeTruthy()
    expect(getRefreshToken()).toBe('valid')
  })

  it('clears the session when there is no refresh token to use', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'r' })
    localStorage.removeItem('backoffice_refresh_token')
    await expect(apiClient.get('/users')).rejects.toBeTruthy()
    expect(refreshCalls).toBe(0)
    expect(getAccessToken()).toBeNull()
  })

  it('never refreshes for requests flagged skipAuthRefresh (login, logout)', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'r' })
    await expect(apiClient.post('/auth/login', {}, { skipAuthRefresh: true })).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(refreshCalls).toBe(0)
  })

  it('does not replay a request twice', async () => {
    setTokens({ access_token: 'expired', refresh_token: 'r' })
    // Even the fresh token is rejected: it must fail after one replay instead of looping.
    apiClient.defaults.adapter = mockAdapter(() => ({ status: 401 }))
    const spy = vi.fn()
    refreshClient.defaults.adapter = mockAdapter(() => {
      spy()
      return { data: { access_token: 'new-access', refresh_token: 'new-refresh' } }
    })
    await expect(apiClient.get('/x')).rejects.toMatchObject({ response: { status: 401 } })
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
