import { lazy, Suspense, useState } from 'react'
import { AuthShell } from './AuthShell'
import { PasswordStep } from './PasswordStep'
import { CodeStep } from './CodeStep'
import { Loader } from '../../components/ui'
import { SaveCodesStep } from './SaveCodesStep'
import { useAuth } from '../../hooks/useAuth'
import { t } from '../../lib/i18n'
import { adminAuthService, type BackofficeSession, type MfaChallenge, type MfaEnrollment } from '../../services/auth'

// Only needed the very first time an account signs in: the QR library stays out of the first download.
const EnrollStep = lazy(() => import('./EnrollStep'))

type Step =
  | { kind: 'password'; notice?: string }
  | { kind: 'code'; mfaToken: string }
  | { kind: 'enroll'; mfaToken: string; enrollment: MfaEnrollment }
  | { kind: 'saveCodes'; session: BackofficeSession }

/**
 * Sign-in in two factors: password, then the authenticator's code. The very first time the account
 * has no authenticator yet, so it sets one up (QR) and receives its recovery codes before entering.
 * Tokens are kept here until the last step, so the session doesn't open while a step is unfinished.
 */
export default function LoginPage() {
  const { signIn } = useAuth()
  const [step, setStep] = useState<Step>({ kind: 'password' })

  const restart = (notice?: string) => setStep({ kind: 'password', notice })

  const handleChallenge = async (challenge: MfaChallenge) => {
    if (challenge.mfa_status === 'enrollment_required') {
      // Asked here, once, and not from an effect: asking twice would hand out two different secrets.
      const enrollment = await adminAuthService.startEnrollment(challenge.mfa_token)
      setStep({ kind: 'enroll', mfaToken: challenge.mfa_token, enrollment })
    } else {
      setStep({ kind: 'code', mfaToken: challenge.mfa_token })
    }
  }

  const handleSession = (session: BackofficeSession) => {
    // Enrollment hands out recovery codes, shown once: hold the tokens until they are saved.
    if (session.recovery_codes && session.recovery_codes.length > 0) setStep({ kind: 'saveCodes', session })
    else signIn(session)
  }

  return (
    <AuthShell>
      {step.kind === 'password' && <PasswordStep notice={step.notice} onChallenge={handleChallenge} />}
      {step.kind === 'code' && (
        <CodeStep
          mfaToken={step.mfaToken}
          onSession={handleSession}
          onExpired={() => restart(t.auth.expired)}
          onBack={() => restart()}
        />
      )}
      {step.kind === 'enroll' && (
        <Suspense fallback={<Loader />}>
          <EnrollStep
            mfaToken={step.mfaToken}
            enrollment={step.enrollment}
            onSession={handleSession}
            onExpired={() => restart(t.auth.expired)}
            onBack={() => restart()}
          />
        </Suspense>
      )}
      {step.kind === 'saveCodes' && <SaveCodesStep codes={step.session.recovery_codes ?? []} onDone={() => signIn(step.session)} />}
    </AuthShell>
  )
}
