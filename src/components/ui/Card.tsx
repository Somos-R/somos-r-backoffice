import MuiCard from '@mui/material/Card'
import MuiCardContent from '@mui/material/CardContent'
import MuiCardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

export interface CardProps {
  children?: React.ReactNode
  sx?: SxProps<Theme>
  elevation?: number
  variant?: 'elevation' | 'outlined'
}

export function Card({ children, sx, elevation = 0, variant = 'outlined' }: CardProps) {
  return (
    <MuiCard elevation={elevation} variant={variant} sx={sx}>
      {children}
    </MuiCard>
  )
}

export interface CardContentProps {
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

export function CardContent({ children, sx }: CardContentProps) {
  return <MuiCardContent sx={sx}>{children}</MuiCardContent>
}

export interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  sx?: SxProps<Theme>
}

export function CardHeader({ title, subtitle, action, sx }: CardHeaderProps) {
  return (
    <MuiCardHeader
      title={<Typography variant="h6" component="h2" fontWeight={600}>{title}</Typography>}
      subheader={subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : undefined}
      action={action}
      sx={sx}
    />
  )
}
