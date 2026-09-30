import axios from 'axios'
import { API_URL } from './env'
import { getAccessToken } from './session'
import { refreshAccessToken } from './tokenRefresh'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Auth endpoints answer 401 for their own reasons; never try to refresh on them. */
    skipAuthRefresh?: boolean
    _retried?: boolean
  }
}

/** Optional last argument of read calls: lets the caller cancel an in-flight request. */
export interface RequestOptions {
  signal?: AbortSignal
}

// Without a timeout axios waits forever, so a hung server leaves the screen spinning with no way
// out. 15 s is long enough for a slow request and short enough that the user gets an answer.
export const REQUEST_TIMEOUT_MS = 15_000

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (error.response?.status !== 401 || !config || config.skipAuthRefresh || config._retried) {
      return Promise.reject(error)
    }

    // Access tokens live 15 minutes: swap in a fresh one and replay the request once.
    // If the refresh fails, the session is cleared and the app falls back to the login screen.
    const sentToken = (config.headers?.Authorization as string | undefined)?.replace(/^Bearer /, '') ?? null
    try {
      const token = await refreshAccessToken(sentToken)
      config._retried = true
      config.headers.Authorization = `Bearer ${token}`
      return apiClient(config)
    } catch {
      return Promise.reject(error)
    }
  }
)
