import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { t } from './lib/i18n'

// Placeholder until sign-in and the first modules arrive.
export default function App() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Box sx={{ textAlign: 'center', maxWidth: 480 }}>
        <Typography variant="h4" component="h1" fontWeight={700}>{t.app.title}</Typography>
        <Typography variant="subtitle1" component="p" color="text.secondary" mt={0.5}>{t.app.subtitle}</Typography>
        <Typography variant="body2" color="text.secondary" mt={3}>{t.app.placeholder}</Typography>
      </Box>
    </Box>
  )
}
