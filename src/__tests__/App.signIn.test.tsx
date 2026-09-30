import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetNotifier } from '../lib/notifier'
import { getAccessToken, clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { queryClient } from '../lib/queryClient'
import {
  ENROLLMENT, GOOD_CODE, GOOD_RECOVERY_CODE, PASSWORD, RECOVERY_CODES, renderAt, serveAdminApi,
} from '../test/fakeAdminApi'

// The two-factor sign-in of the backoffice, as a person goes through it.

const fillPassword = async (password = PASSWORD) => {
  await userEvent.type(await screen.findByLabelText(t.auth.emailLabel), 'ana@somosr.co')
  await userEvent.type(screen.getByLabelText(t.auth.passwordLabel), password)
  await userEvent.click(screen.getByRole('button', { name: t.auth.continueButton }))
}

const enterCode = async (code: string, buttonName = t.auth.code.verifyButton) => {
  await userEvent.type(await screen.findByLabelText(new RegExp(`${t.auth.code.label}|${t.auth.recovery.label}`)), code)
  await userEvent.click(screen.getByRole('button', { name: buttonName }))
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
})

describe('signed-out visitors', () => {
  it('are sent to the sign-in from any page', async () => {
    serveAdminApi()
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: t.auth.title })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })
})

describe('sign-in with an authenticator code', () => {
  it('asks for the password, then the code, and only then opens the session', async () => {
    const api = serveAdminApi()
    renderAt('/login')
    await fillPassword()
    await screen.findByRole('heading', { level: 1, name: t.auth.code.title })
    expect(getAccessToken()).toBeNull() // password alone opens nothing
    await enterCode(GOOD_CODE)

    expect(await screen.findByRole('heading', { level: 1, name: /Bienvenido, Ana Plataforma/ })).toBeInTheDocument()
    expect(getAccessToken()).not.toBeNull()
    expect(api.sent('/admin/auth/mfa/verify')[0].body).toEqual({ mfa_token: 'mfa-1', code: GOOD_CODE })
  })

  it('a wrong password stays on the first step with the translated reason', async () => {
    const api = serveAdminApi()
    renderAt('/login')
    await fillPassword('wrong-password-1')
    expect(await screen.findByText(t.apiErrors.invalid_credentials)).toBeInTheDocument()
    expect(api.sent('/admin/auth/mfa/verify')).toHaveLength(0)
    expect(getAccessToken()).toBeNull()
  })

  it('a wrong code shows the reason and keeps the person on the code step', async () => {
    serveAdminApi()
    renderAt('/login')
    await fillPassword()
    await enterCode('000000')
    expect(await screen.findByText(t.apiErrors.invalid_mfa_code)).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: t.auth.code.title })).toBeInTheDocument()
  })

  it('rejects a code that is not 6 digits before asking the server', async () => {
    const api = serveAdminApi()
    renderAt('/login')
    await fillPassword()
    await enterCode('12ab')
    expect(await screen.findByText(t.auth.validation.codeFormat)).toBeInTheDocument()
    expect(api.sent('/admin/auth/mfa/verify')).toHaveLength(0)
  })

  it('can switch to a recovery code, which is sent as such', async () => {
    const api = serveAdminApi()
    renderAt('/login')
    await fillPassword()
    await userEvent.click(await screen.findByRole('button', { name: t.auth.code.useRecovery }))
    expect(screen.getByRole('heading', { level: 1, name: t.auth.recovery.title })).toBeInTheDocument()
    await enterCode(GOOD_RECOVERY_CODE)

    expect(await screen.findByRole('heading', { level: 1, name: /Bienvenido/ })).toBeInTheDocument()
    expect(api.sent('/admin/auth/mfa/verify')[0].body).toEqual({ mfa_token: 'mfa-1', recovery_code: GOOD_RECOVERY_CODE })
  })

  it('goes back to the password with a notice when the attempt has expired', async () => {
    serveAdminApi({ expireMfa: true })
    renderAt('/login')
    await fillPassword()
    await enterCode(GOOD_CODE)
    expect(await screen.findByText(t.auth.expired)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: t.auth.title })).toBeInTheDocument()
  })

  it('"back" returns to the password step', async () => {
    serveAdminApi()
    renderAt('/login')
    await fillPassword()
    await userEvent.click(await screen.findByRole('button', { name: t.auth.backToStart }))
    expect(screen.getByRole('heading', { level: 1, name: t.auth.title })).toBeInTheDocument()
  })
})

describe('first sign-in: setting up the authenticator', () => {
  it('shows the QR and the manual key, then the recovery codes, and opens the session only after they are saved', async () => {
    const api = serveAdminApi({ enrollment: true })
    renderAt('/login')
    await fillPassword()

    expect(await screen.findByRole('heading', { level: 1, name: t.auth.enroll.title })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: t.auth.enroll.qrLabel })).toBeInTheDocument()
    expect(screen.getByText(ENROLLMENT.secret)).toBeInTheDocument()
    expect(api.sent('/admin/auth/mfa/enroll')).toHaveLength(1) // asked once: two calls would give two secrets

    await enterCode(GOOD_CODE, t.auth.enroll.confirmButton)
    expect(await screen.findByRole('heading', { level: 1, name: t.auth.saveCodes.title })).toBeInTheDocument()
    RECOVERY_CODES.forEach((code) => expect(screen.getByText(code)).toBeInTheDocument())
    expect(getAccessToken()).toBeNull() // the codes are still on screen: the session hasn't opened

    const enter = screen.getByRole('button', { name: t.auth.saveCodes.continueButton })
    expect(enter).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: t.auth.saveCodes.savedCheckbox }))
    await userEvent.click(enter)

    expect(await screen.findByRole('heading', { level: 1, name: /Bienvenido/ })).toBeInTheDocument()
    expect(getAccessToken()).not.toBeNull()
  })

  it('copies the recovery codes to the clipboard', async () => {
    serveAdminApi({ enrollment: true })
    renderAt('/login')
    await fillPassword()
    await enterCode(GOOD_CODE, t.auth.enroll.confirmButton)
    await screen.findByRole('heading', { level: 1, name: t.auth.saveCodes.title })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await userEvent.click(screen.getByRole('button', { name: t.auth.saveCodes.copyButton }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(RECOVERY_CODES.join('\n')))
    expect(await screen.findByText(t.auth.saveCodes.copied)).toBeInTheDocument()
  })

  it('a wrong confirmation code keeps the QR on screen for another try', async () => {
    serveAdminApi({ enrollment: true })
    renderAt('/login')
    await fillPassword()
    await enterCode('000000', t.auth.enroll.confirmButton)
    expect(await screen.findByText(t.apiErrors.invalid_mfa_code)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: t.auth.enroll.qrLabel })).toBeInTheDocument()
  })
})

describe('the signed-in shell', () => {
  it('warns when few recovery codes are left', async () => {
    serveAdminApi({ recoveryCodesRemaining: 2 })
    renderAt('/login')
    await fillPassword()
    await enterCode(GOOD_CODE)
    expect(await screen.findByText('Te quedan 2 códigos de recuperación de tu verificación en dos pasos.')).toBeInTheDocument()
  })

  it('does not warn while there are plenty', async () => {
    serveAdminApi({ recoveryCodesRemaining: 8 })
    renderAt('/login')
    await fillPassword()
    await enterCode(GOOD_CODE)
    await screen.findByRole('heading', { level: 1, name: /Bienvenido/ })
    expect(screen.queryByText(/códigos de recuperación de tu verificación/)).not.toBeInTheDocument()
  })

  it('shows the name and role of the account and lets it sign out', async () => {
    const api = serveAdminApi()
    renderAt('/login')
    await fillPassword()
    await enterCode(GOOD_CODE)
    await screen.findByRole('heading', { level: 1, name: /Bienvenido/ })
    expect(screen.getByText('Somos R · Administrador')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t.sidebar.logout }))
    await userEvent.click(await screen.findByRole('button', { name: t.logout.confirmButton }))
    await waitFor(() => expect(api.sent('/admin/auth/logout')).toHaveLength(1), { timeout: 3000 })
    await waitFor(() => expect(getAccessToken()).toBeNull(), { timeout: 3000 })
    expect(await screen.findByRole('heading', { level: 1, name: t.auth.title })).toBeInTheDocument()
  })

  it('offers a retry when the profile can not be loaded', async () => {
    serveAdminApi({ meStatus: 403 })
    renderAt('/login')
    await fillPassword()
    await enterCode(GOOD_CODE)
    expect(await screen.findByText(t.auth.session.loadError)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.auth.session.retry })).toBeInTheDocument()
  })

  it('unknown addresses show the not-found page', async () => {
    serveAdminApi()
    renderAt('/login')
    await fillPassword()
    await enterCode(GOOD_CODE)
    await screen.findByRole('heading', { level: 1, name: /Bienvenido/ })
    window.history.pushState({}, '', '/nope')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByText(t.notFound.message)).toBeInTheDocument()
  })
})
