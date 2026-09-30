import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from '../useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts with the initial value', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('waits for the value to stop changing before following it', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } })
    rerender({ v: 'ab' })
    act(() => void vi.advanceTimersByTime(200))
    rerender({ v: 'abc' })
    act(() => void vi.advanceTimersByTime(200))
    expect(result.current).toBe('a') // each change restarted the wait
    act(() => void vi.advanceTimersByTime(100))
    expect(result.current).toBe('abc')
  })
})
