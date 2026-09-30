import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Button } from '../ui'
import { t } from '../../lib/i18n'
import { isChunkLoadError } from '../../lib/chunkError'

interface Props {
  error: Error
  onRetry: () => void
  /** Whole-page variant (outside the layout): also offers a full reload, since state may be broken. */
  fullScreen?: boolean
}

/**
 * What the user sees when a screen crashes. The error message is for developers: it is shown only
 * in development, never to users, because it can expose internals.
 */
export function ErrorScreen({ error, onRetry, fullScreen = false }: Props) {
  // React caches a failed lazy import, so "retry" cannot recover: only a reload fetches it again.
  const chunkError = isChunkLoadError(error)

  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        textAlign: 'center',
        px: 2,
        py: fullScreen ? 0 : 10,
        minHeight: fullScreen ? '100vh' : undefined,
      }}
    >
      <Typography variant="h5" component="h1" fontWeight={600}>{t.errorScreen.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {chunkError ? t.errorScreen.chunkMessage : t.errorScreen.message}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        {chunkError ? (
          <Button onClick={() => window.location.reload()}>{t.errorScreen.reload}</Button>
        ) : (
          <Button onClick={onRetry}>{t.errorScreen.retry}</Button>
        )}
        {fullScreen && !chunkError && (
          <Button variant="outlined" onClick={() => window.location.reload()}>{t.errorScreen.reload}</Button>
        )}
      </Box>
      {import.meta.env.DEV && (
        <Box component="pre" sx={{ mt: 2, maxWidth: 640, overflow: 'auto', textAlign: 'left', fontSize: 12, color: 'error.main' }}>
          {error.message}
        </Box>
      )}
    </Box>
  )
}
