import { useState } from 'react'

// The API caps a page at 100 rows (500 for users), so page sizes stop there.
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const DEFAULT_PAGE_SIZE = 25

/** What a paginated table needs from the screen that owns the data. */
export interface PaginationProps {
  /** Zero-based page. */
  page: number
  rowsPerPage: number
  /** Total rows for the current filters, as reported by the server (not the rows loaded). */
  total: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
}

/**
 * Page state for a list that the server paginates: the screen keeps `page`/`rowsPerPage`, sends
 * `limit`/`offset` with the request, and hands `total` back to the table.
 */
export function usePagination(initialRowsPerPage = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPageState] = useState(initialRowsPerPage)

  return {
    page,
    rowsPerPage,
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    setPage,
    setRowsPerPage: (size: number) => {
      setRowsPerPageState(size)
      setPage(0)
    },
    /** Call whenever a filter changes: the old page number means nothing for the new result set. */
    resetPage: () => setPage(0),
    /**
     * Call during render with the latest `total`. If the current page no longer exists (a filter
     * narrowed the results, rows were removed), move to the last page that does.
     */
    clamp: (total: number | undefined) => {
      if (total === undefined || page === 0) return
      const lastPage = Math.max(0, Math.ceil(total / rowsPerPage) - 1)
      if (page > lastPage) setPage(lastPage)
    },
  }
}

/** Props for a table's <TablePagination>, from the owner's state. */
export function toPaginationProps(
  state: ReturnType<typeof usePagination>,
  total: number,
): PaginationProps {
  return {
    page: state.page,
    rowsPerPage: state.rowsPerPage,
    total,
    onPageChange: state.setPage,
    onRowsPerPageChange: state.setRowsPerPage,
  }
}
