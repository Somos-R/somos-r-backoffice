import { useState } from 'react'
import Box from '@mui/material/Box'
import { Alert, Button, Checkbox } from '../../components/ui'
import { AuthCard } from './AuthShell'
import { t } from '../../lib/i18n'

interface Props {
  codes: string[]
  onDone: () => void
}

/**
 * The recovery codes are shown once. The session is only opened after the person confirms they
 * saved them, so they can't be lost by the screen changing on its own.
 */
export function SaveCodesStep({ codes, onDone }: Props) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
    } catch {
      // Clipboard unavailable: the codes are on screen to copy by hand.
    }
  }

  return (
    <AuthCard title={t.auth.saveCodes.title} subtitle={t.auth.saveCodes.subtitle}>
      <Box
        component="ul"
        aria-label={t.auth.saveCodes.listLabel}
        sx={{
          listStyle: 'none',
          m: 0,
          p: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          bgcolor: 'action.hover',
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.95rem',
        }}
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </Box>
      <Button variant="outlined" fullWidth onClick={copy}>
        {t.auth.saveCodes.copyButton}
      </Button>
      {copied && <Alert severity="success">{t.auth.saveCodes.copied}</Alert>}
      <Checkbox label={t.auth.saveCodes.savedCheckbox} checked={saved} onChange={setSaved} />
      <Button fullWidth disabled={!saved} onClick={onDone}>
        {t.auth.saveCodes.continueButton}
      </Button>
    </AuthCard>
  )
}
