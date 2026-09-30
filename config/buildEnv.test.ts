import { describe, expect, it } from 'vitest'
import { assertProductionEnv, validateApiUrl } from './buildEnv'

describe('validateApiUrl (production build)', () => {
  it.each([
    'https://api.somosr.co',
    'https://api.somosr.co/',
    'https://api.somosr.co/v1',
    'https://somosr.com/api',
    'https://somos-r-api.up.railway.app',
    'https://api.example.com:8443',
  ])('accepts %s', (url) => {
    expect(validateApiUrl(url)).toBeNull()
  })

  it.each([undefined, '', '   '])('refuses a missing value (%j): the app would call its own origin', (value) => {
    expect(validateApiUrl(value)).toMatch(/not set/)
  })

  it('explains where to set it', () => {
    expect(validateApiUrl('')).toMatch(/repository variable VITE_API_URL/)
    expect(validateApiUrl('')).toMatch(/--build-arg/)
  })

  it.each([
    'http://localhost:8000',
    'https://localhost',
    'https://127.0.0.1:8000',
    'https://127.1.2.3',
    'https://0.0.0.0',
    'https://[::1]:8000',
    'https://app.localhost',
    'https://LOCALHOST',
  ])('refuses %s: a production build must not point at the developer machine', (url) => {
    expect(validateApiUrl(url)).toMatch(/points at/)
  })

  it('does not mistake a real host that merely contains "local" for localhost', () => {
    expect(validateApiUrl('https://localhost-tools.example.com')).toBeNull()
    expect(validateApiUrl('https://api.localmotion.co')).toBeNull()
  })

  it('refuses plain http, since tokens would travel unencrypted', () => {
    expect(validateApiUrl('http://api.somosr.co')).toMatch(/https/)
  })

  it.each(['api.somosr.co', '/api', 'not a url', 'https://'])('refuses %j, which is not an absolute URL', (value) => {
    expect(validateApiUrl(value)).toMatch(/not a valid absolute URL/)
  })

  it('refuses stray whitespace instead of silently trimming it', () => {
    expect(validateApiUrl(' https://api.somosr.co')).toMatch(/whitespace/)
    expect(validateApiUrl('https://api.somosr.co\n')).toMatch(/whitespace/)
  })

  it('refuses credentials in the URL: the bundle is public', () => {
    expect(validateApiUrl('https://user:secret@api.somosr.co')).toMatch(/credentials/)
    expect(validateApiUrl('https://token@api.somosr.co')).toMatch(/credentials/)
  })

  describe('with allowLocal (testing a production build on a developer machine)', () => {
    it('accepts local and plain http addresses', () => {
      expect(validateApiUrl('http://localhost:8000', { allowLocal: true })).toBeNull()
      expect(validateApiUrl('http://127.0.0.1:8000', { allowLocal: true })).toBeNull()
    })

    it('still refuses a missing, malformed or credential-bearing value', () => {
      expect(validateApiUrl(undefined, { allowLocal: true })).toMatch(/not set/)
      expect(validateApiUrl('nope', { allowLocal: true })).toMatch(/valid absolute URL/)
      expect(validateApiUrl('http://a:b@localhost', { allowLocal: true })).toMatch(/credentials/)
    })
  })
})

describe('assertProductionEnv (what fails the build)', () => {
  it('passes with a real https API URL', () => {
    expect(() => assertProductionEnv({ VITE_API_URL: 'https://api.somosr.co' })).not.toThrow()
  })

  it('throws "Build refused" with the reason when the URL is missing', () => {
    expect(() => assertProductionEnv({})).toThrow(/Build refused: VITE_API_URL is not set/)
    expect(() => assertProductionEnv({ VITE_API_URL: '' })).toThrow(/Build refused/)
  })

  it('throws for localhost, and the message says how to build locally on purpose', () => {
    expect(() => assertProductionEnv({ VITE_API_URL: 'http://localhost:8000' })).toThrow(/Build refused/)
    expect(() => assertProductionEnv({ VITE_API_URL: 'https://localhost' })).toThrow(/ALLOW_LOCAL_API_URL=1/)
  })

  it('lets a developer build locally only with the explicit opt-out', () => {
    const env = { VITE_API_URL: 'http://localhost:8000' }
    expect(() => assertProductionEnv({ ...env, ALLOW_LOCAL_API_URL: '1' })).not.toThrow()
    // Anything other than "1" is not an opt-out.
    expect(() => assertProductionEnv({ ...env, ALLOW_LOCAL_API_URL: 'true' })).toThrow(/Build refused/)
    expect(() => assertProductionEnv({ ...env, ALLOW_LOCAL_API_URL: '0' })).toThrow(/Build refused/)
  })

  it('the opt-out does not excuse a missing URL', () => {
    expect(() => assertProductionEnv({ ALLOW_LOCAL_API_URL: '1' })).toThrow(/not set/)
  })
})
