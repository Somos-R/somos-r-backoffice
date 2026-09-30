import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, toPaginationProps, usePagination } from '../pagination'

describe('usePagination', () => {
  it('starts on the first page with the default size and turns page state into limit/offset', () => {
    const { result } = renderHook(() => usePagination())
    expect(result.current).toMatchObject({ page: 0, rowsPerPage: DEFAULT_PAGE_SIZE, limit: DEFAULT_PAGE_SIZE, offset: 0 })
    act(() => result.current.setPage(3))
    expect(result.current.offset).toBe(3 * DEFAULT_PAGE_SIZE)
  })

  it('changing the page size goes back to the first page', () => {
    const { result } = renderHook(() => usePagination())
    act(() => result.current.setPage(4))
    act(() => result.current.setRowsPerPage(50))
    expect(result.current).toMatchObject({ page: 0, rowsPerPage: 50, limit: 50, offset: 0 })
  })

  it('resetPage returns to the first page (used when a filter changes)', () => {
    const { result } = renderHook(() => usePagination())
    act(() => result.current.setPage(2))
    act(() => result.current.resetPage())
    expect(result.current.page).toBe(0)
  })

  describe('clamp', () => {
    it('moves to the last existing page when the current one no longer exists', () => {
      const { result } = renderHook(() => usePagination(10))
      act(() => result.current.setPage(5))
      act(() => result.current.clamp(23)) // 3 pages: 0, 1, 2
      expect(result.current.page).toBe(2)
    })

    it('leaves a valid page alone, and does nothing before the total is known', () => {
      const { result } = renderHook(() => usePagination(10))
      act(() => result.current.setPage(2))
      act(() => result.current.clamp(23))
      expect(result.current.page).toBe(2)
      act(() => result.current.clamp(undefined))
      expect(result.current.page).toBe(2)
    })

    it('an empty result goes back to the first page instead of a negative one', () => {
      const { result } = renderHook(() => usePagination(10))
      act(() => result.current.setPage(3))
      act(() => result.current.clamp(0))
      expect(result.current.page).toBe(0)
    })
  })

  it('never offers a page size above what the API allows (100)', () => {
    expect(Math.max(...PAGE_SIZE_OPTIONS)).toBeLessThanOrEqual(100)
    expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE)
  })
})

describe('toPaginationProps', () => {
  it('hands the table the page state plus the server total', () => {
    const { result } = renderHook(() => usePagination(10))
    const props = toPaginationProps(result.current, 250)
    expect(props).toMatchObject({ page: 0, rowsPerPage: 10, total: 250 })
    act(() => props.onPageChange(2))
    expect(result.current.page).toBe(2)
    act(() => props.onRowsPerPageChange(25))
    expect(result.current).toMatchObject({ page: 0, rowsPerPage: 25 })
  })
})
