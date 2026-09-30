import { describe, it, expect } from 'vitest'
import { getApiErrorMessage } from '../apiError'
import { t } from '../i18n'

const failure = (status: number, data: unknown = {}, headers: Record<string, unknown> = {}) => ({
  response: { status, data, headers },
})

describe('getApiErrorMessage', () => {
  it('returns a string detail as is', () => {
    expect(getApiErrorMessage(failure(400, { detail: 'Stock insuficiente: disponible 5 kg' }), 'fallback'))
      .toBe('Stock insuficiente: disponible 5 kg')
  })

  it('uses the fallback when there is no usable detail', () => {
    expect(getApiErrorMessage(failure(500), 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(failure(400, { detail: '  ' }), 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(failure(400, { detail: { nested: true } }), 'fallback')).toBe('fallback')
  })

  it('never returns a non-string, even for a 422 array detail', () => {
    const message = getApiErrorMessage(failure(422, { detail: [{ msg: 'Field required', loc: ['body', 'x'] }] }), 'fallback')
    expect(typeof message).toBe('string')
  })

  it('shows messages from our own validators without the Pydantic prefix', () => {
    const detail = [
      { msg: 'Value error, La contraseña debe tener al menos 10 caracteres', loc: ['body', 'password'] },
      { msg: 'Value error, La contraseña es muy común', loc: ['body', 'password'] },
    ]
    expect(getApiErrorMessage(failure(422, { detail }), 'fallback'))
      .toBe('La contraseña debe tener al menos 10 caracteres. La contraseña es muy común')
  })

  it('does not repeat identical validator messages', () => {
    const msg = 'Value error, Contraseña inválida'
    expect(getApiErrorMessage(failure(422, { detail: [{ msg }, { msg }] }), 'fallback')).toBe('Contraseña inválida')
  })

  it('hides technical built-in validation messages behind a generic text', () => {
    const detail = [{ msg: 'String should have at least 3 characters' }]
    expect(getApiErrorMessage(failure(422, { detail }), 'fallback')).toBe(t.errors.validation)
    expect(getApiErrorMessage(failure(422, { detail: 'plain' }), 'fallback')).toBe(t.errors.validation)
  })

  it('tells the user how long to wait on 429 with Retry-After', () => {
    expect(getApiErrorMessage(failure(429, {}, { 'retry-after': '30' }), 'fallback')).toContain('30 segundos')
  })

  it('falls back to a generic 429 message without a usable Retry-After', () => {
    expect(getApiErrorMessage(failure(429), 'fallback')).toBe(t.errors.tooManyRequests)
    expect(getApiErrorMessage(failure(429, {}, { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }), 'fallback'))
      .toBe(t.errors.tooManyRequests)
  })

  it('reports connection problems when there is no response', () => {
    expect(getApiErrorMessage(new Error('Network Error'), 'fallback')).toBe(t.errors.network)
    expect(getApiErrorMessage(undefined, 'fallback')).toBe(t.errors.network)
  })
})
