import { t, interpolate } from './i18n'

interface ApiErrorShape {
  response?: {
    status?: number
    data?: { detail?: unknown; code?: unknown }
    headers?: Record<string, unknown>
  }
}

// Pydantic prefixes messages raised by our own validators (the ones written for end users,
// e.g. password policy) with this; built-in type errors ("Field required") don't have it.
const CUSTOM_VALIDATOR_PREFIX = 'Value error, '

function validationMessage(detail: unknown[]): string {
  const messages = detail
    .map((item) => (item as { msg?: unknown })?.msg)
    .filter((msg): msg is string => typeof msg === 'string' && msg.startsWith(CUSTOM_VALIDATOR_PREFIX))
    .map((msg) => msg.slice(CUSTOM_VALIDATOR_PREFIX.length))
  // Built-in messages are technical English: show them only via the generic text.
  return messages.length > 0 ? [...new Set(messages)].join('. ') : t.errors.validation
}

function retryAfterSeconds(headers: Record<string, unknown> | undefined): number | null {
  const raw = headers?.['retry-after']
  const seconds = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null
}

/** The request took longer than the client's timeout (axios reports it without a response). */
export function isTimeoutError(error: unknown): boolean {
  const code = (error as { code?: string })?.code
  return code === 'ECONNABORTED' || code === 'ETIMEDOUT'
}

/** The caller aborted the request (screen closed, query key changed): not a failure. */
export function isCancelError(error: unknown): boolean {
  return (error as { code?: string })?.code === 'ERR_CANCELED' || (error as { name?: string })?.name === 'CanceledError'
}

/** Spanish text for one of the backend's stable error codes, or undefined if this build doesn't know it. */
export function translateErrorCode(code: unknown): string | undefined {
  const messages = t.apiErrors as Record<string, string>
  // hasOwn: a code like "constructor" must not resolve to something on Object.prototype.
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(messages, code) ? messages[code] : undefined
}

/** The backend's stable error `code` (e.g. `weighing_not_found`), if the response has one. */
export function getErrorCode(error: unknown): string | undefined {
  const code = (error as ApiErrorShape)?.response?.data?.code
  return typeof code === 'string' ? code : undefined
}

/**
 * Turns a failed API call into text that is safe to render.
 *
 * Order: the stable `code` (translated here, so the text doesn't depend on the backend's wording),
 * then the backend's `detail` as a fallback, then the caller's own fallback.
 *
 * The backend's `detail` is a string for most errors but an array of objects for 422
 * validation errors; passing it straight into JSX crashes React, so every `onError` goes
 * through here.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as ApiErrorShape)?.response
  if (!response) return isTimeoutError(error) ? t.errors.timeout : t.errors.network

  const detail = response.data?.detail
  const hasDetail = typeof detail === 'string' && detail.trim() !== ''

  // These two carry information a fixed sentence can't: how long to wait, which field failed.
  if (response.status === 429) {
    const seconds = retryAfterSeconds(response.headers)
    return seconds ? interpolate(t.errors.tooManyRequestsWait, { seconds }) : t.errors.tooManyRequests
  }
  if (response.status === 422) {
    return Array.isArray(detail) ? validationMessage(detail) : t.errors.validation
  }

  const code = getErrorCode(error)
  const translated = translateErrorCode(code)
  if (translated) return translated

  return hasDetail ? detail : fallback
}
