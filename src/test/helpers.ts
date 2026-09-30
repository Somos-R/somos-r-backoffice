import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'

/** Builds an unsigned JWT with the given payload, enough for code that only reads claims. */
export function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`
}

export const httpError = (config: InternalAxiosRequestConfig, status: number, data: unknown = {}) =>
  new AxiosError(`HTTP ${status}`, String(status), config, null, {
    status, data, statusText: '', headers: {}, config,
  } as AxiosResponse)

type Reply = { status?: number; data?: unknown }

/** Axios adapter driven by a handler, so tests never touch the network. */
export function mockAdapter(handler: (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>): AxiosAdapter {
  return async (config) => {
    const { status = 200, data = {} } = await handler(config)
    if (status >= 400) throw httpError(config, status, data)
    return { status, data, statusText: 'OK', headers: {}, config } as AxiosResponse
  }
}
