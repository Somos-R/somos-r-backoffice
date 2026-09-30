import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearSession, getAccessToken, getRefreshToken, setTokens, subscribe } from '../session'

describe('session', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and clears both tokens', () => {
    setTokens({ access_token: 'a', refresh_token: 'r' })
    expect(getAccessToken()).toBe('a')
    expect(getRefreshToken()).toBe('r')
    clearSession()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('keeps the tokens under backoffice-specific keys', () => {
    setTokens({ access_token: 'a', refresh_token: 'r' })
    expect(localStorage.getItem('backoffice_access_token')).toBe('a')
    expect(localStorage.getItem('backoffice_refresh_token')).toBe('r')
  })

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    setTokens({ access_token: 'a', refresh_token: 'r' })
    clearSession()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    setTokens({ access_token: 'b', refresh_token: 'r2' })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('notifies subscribers when another tab changes the tokens', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    window.dispatchEvent(new StorageEvent('storage', { key: 'backoffice_access_token' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }))
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
