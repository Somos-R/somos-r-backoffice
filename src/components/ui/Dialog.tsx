import MuiDialog from '@mui/material/Dialog'
import MuiDialogTitle from '@mui/material/DialogTitle'
import MuiDialogContent from '@mui/material/DialogContent'
import MuiDialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import { X } from 'lucide-react'
import type { SxProps, Theme } from '@mui/material/styles'
import { t } from '../../lib/i18n'

export interface DialogProps {
  open: boolean
  onClose?: () => void
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

export function Dialog({
  open,
  onClose,
  maxWidth = 'sm',
  fullWidth = true,
  children,
  sx,
}: DialogProps) {
  return (
    <MuiDialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth={fullWidth} sx={sx}>
      {children}
    </MuiDialog>
  )
}

export interface DialogTitleProps {
  children?: React.ReactNode
  showClose?: boolean
  onClose?: () => void
}

export function DialogTitle({ children, showClose, onClose }: DialogTitleProps) {
  return (
    <MuiDialogTitle sx={{ pr: showClose ? 6 : 3 }}>
      {children}
      {showClose && (
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 12, top: 12 }}
          aria-label={t.common.close}
        >
          <X size={18} />
        </IconButton>
      )}
    </MuiDialogTitle>
  )
}

export interface DialogContentProps {
  children?: React.ReactNode
  dividers?: boolean
}

export function DialogContent({ children, dividers }: DialogContentProps) {
  return <MuiDialogContent dividers={dividers}>{children}</MuiDialogContent>
}

export interface DialogActionsProps {
  children?: React.ReactNode
}

export function DialogActions({ children }: DialogActionsProps) {
  return <MuiDialogActions sx={{ px: 3, pb: 2, gap: 1 }}>{children}</MuiDialogActions>
}
