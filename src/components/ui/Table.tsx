import MuiTable from '@mui/material/Table'
import { t, interpolate } from '../../lib/i18n'
import MuiTableHead from '@mui/material/TableHead'
import MuiTableBody from '@mui/material/TableBody'
import MuiTableRow from '@mui/material/TableRow'
import MuiTableCell from '@mui/material/TableCell'
import MuiTableContainer from '@mui/material/TableContainer'
import MuiTablePagination from '@mui/material/TablePagination'
import Paper from '@mui/material/Paper'
import type { SxProps, Theme } from '@mui/material/styles'

interface TableProps {
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

export function Table({ children, sx }: TableProps) {
  return <MuiTable sx={sx}>{children}</MuiTable>
}

export function TableHead({ children }: { children?: React.ReactNode }) {
  return <MuiTableHead>{children}</MuiTableHead>
}

export function TableBody({ children }: { children?: React.ReactNode }) {
  return <MuiTableBody>{children}</MuiTableBody>
}

interface TableRowProps {
  children?: React.ReactNode
  hover?: boolean
}

export function TableRow({ children, hover }: TableRowProps) {
  return <MuiTableRow hover={hover}>{children}</MuiTableRow>
}

interface TableCellProps {
  children?: React.ReactNode
  align?: 'left' | 'center' | 'right'
  colSpan?: number
  sx?: SxProps<Theme>
}

export function TableCell({ children, align, colSpan, sx }: TableCellProps) {
  return (
    <MuiTableCell align={align} colSpan={colSpan} sx={sx}>
      {children}
    </MuiTableCell>
  )
}

interface TableContainerProps {
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

export function TableContainer({ children, sx }: TableContainerProps) {
  return (
    <MuiTableContainer component={Paper} elevation={0} variant="outlined" sx={sx}>
      {children}
    </MuiTableContainer>
  )
}

interface TablePaginationProps {
  count: number
  page: number
  rowsPerPage: number
  onPageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void
  onRowsPerPageChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  rowsPerPageOptions?: number[]
  labelRowsPerPage?: string
}

export function TablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [8, 15, 25],
  labelRowsPerPage = t.ui.table.rowsPerPage,
}: TablePaginationProps) {
  return (
    <MuiTablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={onPageChange}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={rowsPerPageOptions}
      labelRowsPerPage={labelRowsPerPage}
      labelDisplayedRows={({ from, to, count: total }) =>
        interpolate(t.ui.table.displayedRows, { from, to, total: total !== -1 ? total : interpolate(t.ui.table.moreThan, { to }) })
      }
    />
  )
}
