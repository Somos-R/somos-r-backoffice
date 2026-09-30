import CircularProgress from '@mui/material/CircularProgress'
import type { SxProps, Theme } from '@mui/material/styles'
import { t } from '../../lib/i18n'

export interface LoaderProps {
  size?: number
  color?: 'primary' | 'inherit'
  /** What a screen reader announces. Defaults to "Cargando…". */
  label?: string
  sx?: SxProps<Theme>
}

/** Spinner with an accessible name: a bare progress indicator is announced as an unnamed "progress bar". */
export function Loader({ size, color = 'primary', label = t.common.loading, sx }: LoaderProps) {
  return <CircularProgress size={size} color={color} aria-label={label} sx={sx} />
}
