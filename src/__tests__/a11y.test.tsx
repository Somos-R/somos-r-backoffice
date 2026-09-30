import { beforeEach, describe, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'
import { GOOD_CODE, PASSWORD, renderAt, serveAdminApi } from '../test/fakeAdminApi'

// Accessibility of every screen, checked with axe-core on the rendered DOM.

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
})

const toPasswordAndContinue = async () => {
  await userEvent.type(await screen.findByLabelText(t.auth.emailLabel), 'ana@somosr.co')
  await userEvent.type(screen.getByLabelText(t.auth.passwordLabel), PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: t.auth.continueButton }))
}

describe('accessibility: sign-in', () => {
  it('password step', async () => {
    serveAdminApi()
    renderAt('/login')
    await screen.findByRole('button', { name: t.auth.continueButton })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('authenticator code step', async () => {
    serveAdminApi()
    renderAt('/login')
    await toPasswordAndContinue()
    await screen.findByRole('heading', { level: 1, name: t.auth.code.title })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('recovery code step', async () => {
    serveAdminApi()
    renderAt('/login')
    await toPasswordAndContinue()
    await userEvent.click(await screen.findByRole('button', { name: t.auth.code.useRecovery }))
    await screen.findByRole('heading', { level: 1, name: t.auth.recovery.title })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('authenticator set-up step (QR)', async () => {
    serveAdminApi({ enrollment: true })
    renderAt('/login')
    await toPasswordAndContinue()
    await screen.findByRole('img', { name: t.auth.enroll.qrLabel })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('recovery codes step', async () => {
    serveAdminApi({ enrollment: true })
    renderAt('/login')
    await toPasswordAndContinue()
    await userEvent.type(await screen.findByLabelText(t.auth.code.label), GOOD_CODE)
    await userEvent.click(screen.getByRole('button', { name: t.auth.enroll.confirmButton }))
    await screen.findByRole('heading', { level: 1, name: t.auth.saveCodes.title })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })
})

describe('accessibility: signed-in screens', () => {
  const signedIn = async (recoveryCodesRemaining = 8) => {
    serveAdminApi({ recoveryCodesRemaining })
    renderAt('/login')
    await toPasswordAndContinue()
    await userEvent.type(await screen.findByLabelText(t.auth.code.label), GOOD_CODE)
    await userEvent.click(screen.getByRole('button', { name: t.auth.code.verifyButton }))
    await screen.findByRole('heading', { level: 1, name: /Bienvenido/ })
  }

  it('home', async () => {
    await signedIn()
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('home with the low recovery codes warning', async () => {
    await signedIn(1)
    await screen.findByText(/Te quedan 1 códigos/)
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('logout confirmation', async () => {
    await signedIn()
    await userEvent.click(screen.getByRole('button', { name: t.sidebar.logout }))
    await screen.findByRole('button', { name: t.logout.confirmButton })
    await expectNoA11yViolations()
  })
})
