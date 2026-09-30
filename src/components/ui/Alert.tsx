import MuiAlert from '@mui/material/Alert'
import type { SxProps, Theme } from '@mui/material/styles'

export interface AlertProps {
  severity: 'success' | 'error' | 'warning' | 'info'
  children?: React.ReactNode
  onClose?: () => void
  sx?: SxProps<Theme>
}

export function Alert({ severity, children, onClose, sx }: AlertProps) {
  return (
    <MuiAlert severity={severity} onClose={onClose} sx={sx}>
      {children}
    </MuiAlert>
  )
}
