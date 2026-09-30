import { describe, it, expect } from 'vitest'
import { queryClient, shouldRetry } from '../queryClient'

const httpError = (status: number) => ({ response: { status } })

describe('shouldRetry', () => {
  it.each([400, 401, 403, 404, 422, 429])('does not retry %i responses', (status) => {
    expect(shouldRetry(0, httpError(status))).toBe(false)
  })

  it('retries server errors up to the limit', () => {
    expect(shouldRetry(0, httpError(503))).toBe(true)
    expect(shouldRetry(1, httpError(500))).toBe(true)
    expect(shouldRetry(2, httpError(500))).toBe(false)
  })

  it('retries network errors without a response', () => {
    expect(shouldRetry(0, new Error('Network Error'))).toBe(true)
    expect(shouldRetry(2, new Error('Network Error'))).toBe(false)
  })
})

describe('queryClient', () => {
  it('uses a non-zero staleTime and the shared retry policy', () => {
    const opts = queryClient.getDefaultOptions().queries
    expect(opts?.staleTime).toBeGreaterThan(0)
    expect(opts?.retry).toBe(shouldRetry)
  })
})
