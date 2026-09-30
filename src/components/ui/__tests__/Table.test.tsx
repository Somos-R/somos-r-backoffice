import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Table, TableHead, TableBody, TableRow, TableCell, TablePagination } from '../Table'

describe('Table', () => {
  it('renders rows and cells', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Papel</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Papel')).toBeInTheDocument()
  })

  it('forwards colSpan to the underlying cell, for empty-state rows', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} align="center">Sin resultados</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('Sin resultados').closest('td')).toHaveAttribute('colspan', '4')
  })
})

describe('TablePagination', () => {
  const renderPagination = (count: number) =>
    render(<TablePagination count={count} page={0} rowsPerPage={10} onPageChange={() => undefined} />)

  it('shows the range and the total', () => {
    renderPagination(95)
    expect(screen.getByText('1–10 de 95')).toBeInTheDocument()
  })

  it('says "más de N" when the total is unknown, using the dictionary text', () => {
    renderPagination(-1)
    expect(screen.getByText('1–10 de más de 10')).toBeInTheDocument()
  })
})

