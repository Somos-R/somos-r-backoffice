import { useState } from 'react'
import Box from '@mui/material/Box'
import { Alert, Button, Input } from '../../components/ui'
import { AuthCard } from './AuthShell'
import { t } from '../../lib/i18n'
import { getApiErrorMessage, getErrorCode } from '../../lib/apiError'
import { adminAuthService, type BackofficeSession } from '../../services/auth'

interface Props {
  mfaToken: string
  onSession: (session: BackofficeSession) => void
  /** The attempt ran out of time: the user has to start again with their password. */
  onExpired: () => void
  onBack: () => void
}

/** Step 2: the authenticator's code, or (switching the mode) one recovery code. */
export function CodeStep({ mfaToken, onSession, onExpired, onBack }: Props) {
  const [useRecovery, setUseRecovery] = useState(false)
  const [value, setValue] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const validate = () => {
    const text = value.trim()
    const problem = useRecovery
      ? !text
        ? t.auth.validation.recoveryRequired
        : text.length < 8 || text.length > 16
          ? t.auth.validation.recoveryFormat
          : ''
      : !text
        ? t.auth.validation.codeRequired
        : !/^\d{6}$/.test(text)
          ? t.auth.validation.codeFormat
          : ''
    setFieldError(problem)
    return !problem
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    setError('')
    try {
      const text = value.trim()
      onSession(await adminAuthService.verify(mfaToken, useRecovery ? { recoveryCode: text } : { code: text }))
    } catch (err) {
      if (getErrorCode(err) === 'mfa_session_expired') {
        onExpired()
        return
      }
      setError(getApiErrorMessage(err, t.auth.errors.generic))
      setBusy(false)
    }
  }

  const switchMode = () => {
    setUseRecovery((v) => !v)
    setValue('')
    setFieldError('')
    setError('')
  }

  const copy = useRecovery ? t.auth.recovery : t.auth.code

  return (
    <AuthCard title={useRecovery ? t.auth.recovery.title : t.auth.code.title} subtitle={useRecovery ? t.auth.recovery.subtitle : t.auth.code.subtitle}>
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Input
          // Remounted per mode so the field takes focus again and the browser doesn't offer the wrong autofill.
          key={useRecovery ? 'recovery' : 'code'}
          label={copy.label}
          autoFocus
          autoComplete={useRecovery ? 'off' : 'one-time-code'}
          inputMode={useRecovery ? 'text' : 'numeric'}
          value={value}
          onChange={(e) => { setValue(e.target.value); setFieldError('') }}
          disabled={busy}
          error={!!fieldError}
          helperText={fieldError}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" fullWidth loading={busy} disabled={!value.trim()}>
          {t.auth.code.verifyButton}
        </Button>
        <Button variant="text" fullWidth onClick={switchMode} disabled={busy}>
          {useRecovery ? t.auth.recovery.useAuthenticator : t.auth.code.useRecovery}
        </Button>
        <Button variant="text" fullWidth onClick={onBack} disabled={busy}>
          {t.auth.backToStart}
        </Button>
      </Box>
    </AuthCard>
  )
}
