import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../ui'
import { useRoles } from '../../hooks/useRoles'
import { t } from '../../lib/i18n'
import type { Permission } from '../../lib/permissions'
import { getHomePath } from '../../routes'

interface Props {
  permission: Permission
  /** Send the account to their first allowed page instead of showing the 403 (used for `/`). */
  redirectIfDenied?: boolean
  children: React.ReactNode
}

/**
 * Route guard. It is a UX layer: the backend still answers 403 to anything the account can't do,
 * so this only stops people from landing on screens that would just fail to load.
 */
export function RequirePermission({ permission, redirectIfDenied = false, children }: Props) {
  const { can } = useRoles()
  const navigate = useNavigate()

  if (can(permission)) return <>{children}</>
  if (redirectIfDenied) return <Navigate to={getHomePath(can)} replace />

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10, textAlign: 'center' }}>
      <Typography variant="h5" component="h1" fontWeight={600}>{t.forbidden.title}</Typography>
      <Typography variant="body2" color="text.secondary">{t.forbidden.message}</Typography>
      <Button onClick={() => navigate(getHomePath(can), { replace: true })}>{t.forbidden.back}</Button>
    </Box>
  )
}
