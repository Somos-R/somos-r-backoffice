import { useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { Eye, EyeOff } from 'lucide-react'
import { Alert, Button, Input } from '../../components/ui'
import { AuthCard } from './AuthShell'
import { t } from '../../lib/i18n'
import { getApiErrorMessage } from '../../lib/apiError'
import { adminAuthService, type MfaChallenge } from '../../services/auth'

interface Props {
  /** Shown above the form, e.g. when the previous attempt expired. */
  notice?: string
  onChallenge: (challenge: MfaChallenge) => Promise<void>
}

/** Step 1: email and password. */
export function PasswordStep({ notice, onChallenge }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const validate = () => {
    const emailProblem = !email.trim()
      ? t.auth.validation.emailRequired
      : !/^\S+@\S+\.\S+$/.test(email.trim())
        ? t.auth.validation.emailInvalid
        : ''
    const passwordProblem = password ? '' : t.auth.validation.passwordRequired
    setEmailError(emailProblem)
    setPasswordError(passwordProblem)
    return !emailProblem && !passwordProblem
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    setError('')
    try {
      await onChallenge(await adminAuthService.login(email.trim(), password))
    } catch (err) {
      setError(getApiErrorMessage(err, t.auth.errors.generic))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title={t.auth.title} subtitle={t.auth.subtitle}>
      <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Input
          label={t.auth.emailLabel}
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
          disabled={busy}
          error={!!emailError}
          helperText={emailError}
        />
        <Input
          label={t.auth.passwordLabel}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
          disabled={busy}
          error={!!passwordError}
          helperText={passwordError}
          endAdornment={
            <IconButton
              size="small"
              aria-label={t.ui.formDrawer.togglePasswordVisibility}
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </IconButton>
          }
        />
        {notice && <Alert severity="info">{notice}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" fullWidth loading={busy} disabled={!email || !password}>
          {t.auth.continueButton}
        </Button>
      </Box>
    </AuthCard>
  )
}
