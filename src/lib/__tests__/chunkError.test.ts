import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from '../chunkError'

describe('isChunkLoadError', () => {
  it.each([
    ['Chrome / Edge', 'Failed to fetch dynamically imported module: https://app.somosr.co/assets/Inventory-abc123.js'],
    ['Firefox', 'error loading dynamically imported module: https://app.somosr.co/assets/Inventory-abc123.js'],
    ['Safari', 'Importing a module script failed.'],
    ['webpack style', 'Loading chunk 5 failed.'],
    ['CSS chunk', 'Loading CSS chunk 7 failed.'],
  ])('recognises the %s message', (_browser, message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  it('does not mistake other errors for a failed download', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'label')"))).toBe(false)
    expect(isChunkLoadError(new Error('Network Error'))).toBe(false)
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })
})
