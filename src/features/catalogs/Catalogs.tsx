import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CatalogSection from './CatalogSection'
import { Snackbar } from '../../components/ui'
import { t } from '../../lib/i18n'

export default function Catalogs() {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const notify = (message: string, severity: 'success' | 'error') => setSnackbar({ open: true, message, severity })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.catalogs.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.catalogs.subtitle}</Typography>
      </Box>

      <CatalogSection kind="materials" onNotify={notify} />
      <CatalogSection kind="document-types" onNotify={notify} />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  )
}
