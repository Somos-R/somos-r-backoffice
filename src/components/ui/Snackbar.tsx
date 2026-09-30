import MuiSnackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'

export interface SnackbarProps {
  open: boolean
  onClose: () => void
  message: string
  severity?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export function Snackbar({
  open,
  onClose,
  message,
  severity = 'success',
  duration = 3000,
}: SnackbarProps) {
  return (
    <MuiSnackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <MuiAlert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </MuiAlert>
    </MuiSnackbar>
  )
}
