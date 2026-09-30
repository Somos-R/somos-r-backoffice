import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Alert } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { t, interpolate } from '../../lib/i18n'

// With this many recovery codes left or fewer, warn: they are the only way in if the authenticator is lost.
const LOW_RECOVERY_CODES = 3

export default function Home() {
  const { user } = useAuth()
  const remaining = user?.recovery_codes_remaining ?? null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>
          {interpolate(t.home.greeting, { name: user?.full_name ?? '' })}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.home.subtitle}</Typography>
      </Box>

      {remaining !== null && remaining <= LOW_RECOVERY_CODES && (
        <Alert severity="warning">
          {remaining === 0 ? t.home.recoveryNone : interpolate(t.home.recoveryLow, { count: remaining })}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary">{t.home.soon}</Typography>
    </Box>
  )
}
