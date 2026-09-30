import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { QRCodeSVG } from 'qrcode.react'
import { Alert, Button, Input } from '../../components/ui'
import { AuthCard } from './AuthShell'
import { t } from '../../lib/i18n'
import { getApiErrorMessage, getErrorCode } from '../../lib/apiError'
import { adminAuthService, type BackofficeSession, type MfaEnrollment } from '../../services/auth'

interface Props {
  mfaToken: string
  enrollment: MfaEnrollment
  onSession: (session: BackofficeSession) => void
  onExpired: () => void
  onBack: () => void
}

/** First sign-in: set up the authenticator app, prove it works, and get the recovery codes. */
export default function EnrollStep({ mfaToken, enrollment, onSession, onExpired, onBack }: Props) {
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = code.trim()
    const problem = !text ? t.auth.validation.codeRequired : !/^\d{6}$/.test(text) ? t.auth.validation.codeFormat : ''
    setFieldError(problem)
    if (problem) return
    setBusy(true)
    setError('')
    try {
      onSession(await adminAuthService.confirmEnrollment(mfaToken, text))
    } catch (err) {
      if (getErrorCode(err) === 'mfa_session_expired') {
        onExpired()
        return
      }
      setError(getApiErrorMessage(err, t.auth.errors.generic))
      setBusy(false)
    }
  }

  return (
    <AuthCard title={t.auth.enroll.title} subtitle={t.auth.enroll.subtitle}>
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <QRCodeSVG value={enrollment.otpauth_uri} size={176} title={t.auth.enroll.qrLabel} />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" component="p">{t.auth.enroll.manualKey}</Typography>
        <Typography component="code" sx={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all', userSelect: 'all' }}>
          {enrollment.secret}
        </Typography>
      </Box>
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Input
          label={t.auth.code.label}
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          value={code}
          onChange={(e) => { setCode(e.target.value); setFieldError('') }}
          disabled={busy}
          error={!!fieldError}
          helperText={fieldError}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" fullWidth loading={busy} disabled={!code.trim()}>
          {t.auth.enroll.confirmButton}
        </Button>
        <Button variant="text" fullWidth onClick={onBack} disabled={busy}>
          {t.auth.backToStart}
        </Button>
      </Box>
    </AuthCard>
  )
}
