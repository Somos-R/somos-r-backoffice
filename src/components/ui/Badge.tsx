import Chip from '@mui/material/Chip'
import type { SxProps, Theme } from '@mui/material/styles'

export type BadgeColor = 'success' | 'warning' | 'error' | 'default' | 'info' | 'primary'

export interface BadgeProps {
  label: string
  color?: BadgeColor
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
}

export function Badge({ label, color = 'default', size = 'small', sx }: BadgeProps) {
  return <Chip label={label} color={color} size={size} sx={sx} />
}
