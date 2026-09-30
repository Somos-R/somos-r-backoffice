// Token storage for the current browser session.
//
// Plain module on purpose (no React, no store library): the axios interceptors need to read
// the tokens outside components, and React subscribes through `subscribe`. Storage is
// localStorage for now; moving the refresh token to an HttpOnly cookie is tracked in the web's
// plan (F1.4) and applies here too. Keys are specific to the backoffice.

const ACCESS_KEY = 'backoffice_access_token'
const REFRESH_KEY = 'backoffice_refresh_token'

export interface SessionTokens {
  access_token: string
  refresh_token: string
}

type Listener = () => void
const listeners = new Set<Listener>()

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode, quota): the session just won't survive a reload.
  }
}

function emit() {
  listeners.forEach((l) => l())
}

export const getAccessToken = (): string | null => read(ACCESS_KEY)
export const getRefreshToken = (): string | null => read(REFRESH_KEY)

export function setTokens({ access_token, refresh_token }: SessionTokens) {
  write(ACCESS_KEY, access_token)
  write(REFRESH_KEY, refresh_token)
  emit()
}

export function clearSession() {
  write(ACCESS_KEY, null)
  write(REFRESH_KEY, null)
  emit()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Another tab logged in, refreshed or logged out: tell this tab's subscribers.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === ACCESS_KEY || e.key === REFRESH_KEY) emit()
  })
}
