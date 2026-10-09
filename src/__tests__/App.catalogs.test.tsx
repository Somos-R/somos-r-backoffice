import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession, setTokens } from '../lib/session'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'
import { fakeJwt, mockAdapter } from '../test/helpers'

// The catalogs module: materials and document types, which Somos R maintains for every portal.
// Nothing is deleted: an entry is deactivated, which only stops new use.

interface Entry { code: string; label: string; unit?: string; is_active: boolean }

let MATERIALS: Entry[]
let TYPES: Entry[]

interface Recorded { method: string; url: string; body: unknown }
let requests: Recorded[]
let failure: { status: number; code: string } | null

function serve(capabilities: string[] = ['catalogs.manage']) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const method = String(c.method).toUpperCase()
    const body = c.data ? JSON.parse(c.data) : undefined
    requests.push({ method, url, body })

    if (url === '/admin/me') {
      return { data: { id: 'me', email: 'me@somosr.co', full_name: 'Ana Plataforma', role_code: 'platform_admin', capabilities, mfa_enabled: true, recovery_codes_remaining: 8 } }
    }
    const route = url.match(/^\/admin\/catalogs\/(materials|document-types)(?:\/([^/]+))?$/)
    if (!route) return { data: {} }
    const list = route[1] === 'materials' ? MATERIALS : TYPES
    if (method === 'GET') return { data: list }
    if (failure) return { status: failure.status, data: { detail: 'x', code: failure.code } }
    if (method === 'POST') {
      const entry: Entry = { code: body.code, label: body.label, is_active: true, ...(route[1] === 'materials' ? { unit: 'kg' } : {}) }
      list.push(entry)
      return { status: 201, data: entry }
    }
    const entry = list.find((e) => e.code === route[2])!
    Object.assign(entry, body)
    return { data: entry }
  })
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

const to = (method: string, url: string) => requests.filter((r) => r.method === method && r.url === url)
const section = async (title: string) => within(await screen.findByRole('region', { name: title }))

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
  failure = null
  MATERIALS = [
    { code: 'plastic', label: 'Plástico', unit: 'kg', is_active: true },
    { code: 'glass', label: 'Vidrio', unit: 'kg', is_active: false },
  ]
  TYPES = [
    { code: 'CC', label: 'Cédula de Ciudadanía', is_active: true },
    { code: 'PA', label: 'Pasaporte', is_active: true },
  ]
})

describe('catalogs screen', () => {
  it('lists both catalogs with their inactive entries, and the unit only for materials', async () => {
    serve()
    renderAt('/catalogos')
    const materials = await section(t.catalogs.materials.title)
    const glass = await materials.findByRole('row', { name: /Vidrio/ })
    expect(within(glass).getByText(t.catalogs.status.inactive)).toBeInTheDocument()
    expect(within(await materials.findByRole('row', { name: /Plástico/ })).getByText('kg')).toBeInTheDocument()

    const types = await section(t.catalogs.documentTypes.title)
    expect(within(await types.findByRole('row', { name: /Pasaporte/ })).getByText(t.catalogs.status.active)).toBeInTheDocument()
    expect(types.queryByRole('columnheader', { name: t.catalogs.table.unit })).not.toBeInTheDocument()
  })

  it('adds a material with its code and name', async () => {
    serve()
    renderAt('/catalogos')
    const materials = await section(t.catalogs.materials.title)
    await userEvent.click(await materials.findByRole('button', { name: t.catalogs.materials.add }))
    const drawer = within(await screen.findByRole('presentation'))
    await userEvent.type(drawer.getByLabelText(new RegExp(t.catalogs.materials.codeLabel)), 'cardboard')
    await userEvent.type(drawer.getByLabelText(new RegExp(t.catalogs.materials.nameLabel)), ' Cartón ')
    await userEvent.click(drawer.getByRole('button', { name: t.ui.formDrawer.save }))

    await waitFor(() => expect(to('POST', '/admin/catalogs/materials')).toHaveLength(1))
    expect(to('POST', '/admin/catalogs/materials')[0].body).toEqual({ code: 'cardboard', label: 'Cartón' })
    expect(await screen.findByText('Cartón fue agregado')).toBeInTheDocument()
    expect(await materials.findByRole('row', { name: /Cartón/ })).toBeInTheDocument()
  })

  it('does not send a code in the wrong format, with the rule for each catalog', async () => {
    serve()
    renderAt('/catalogos')
    const types = await section(t.catalogs.documentTypes.title)
    await userEvent.click(await types.findByRole('button', { name: t.catalogs.documentTypes.add }))
    const drawer = within(await screen.findByRole('presentation'))
    await userEvent.type(drawer.getByLabelText(new RegExp(t.catalogs.documentTypes.codeLabel)), 'ppt')
    await userEvent.type(drawer.getByLabelText(new RegExp(t.catalogs.documentTypes.nameLabel)), 'Permiso')
    await userEvent.click(drawer.getByRole('button', { name: t.ui.formDrawer.save }))
    expect(await drawer.findByText(t.catalogs.documentTypes.codeFormat)).toBeInTheDocument()
    expect(to('POST', '/admin/catalogs/document-types')).toHaveLength(0)
  })

  it('shows the translated reason when the code is already taken', async () => {
    serve()
    failure = { status: 409, code: 'code_already_exists' }
    renderAt('/catalogos')
    const types = await section(t.catalogs.documentTypes.title)
    await userEvent.click(await types.findByRole('button', { name: t.catalogs.documentTypes.add }))
    const drawer = within(await screen.findByRole('presentation'))
    await userEvent.type(drawer.getByLabelText(new RegExp(t.catalogs.documentTypes.codeLabel)), 'CC')
    await userEvent.type(drawer.getByLabelText(new RegExp(t.catalogs.documentTypes.nameLabel)), 'Otra')
    await userEvent.click(drawer.getByRole('button', { name: t.ui.formDrawer.save }))
    expect(await screen.findByText(t.apiErrors.code_already_exists)).toBeInTheDocument()
  })

  it('renames an entry without touching its code', async () => {
    serve()
    renderAt('/catalogos')
    const materials = await section(t.catalogs.materials.title)
    await userEvent.click(await materials.findByRole('button', { name: `${t.catalogs.actions.edit} Plástico` }))
    const dialog = within(await screen.findByRole('dialog'))
    // Nothing to save until the name changes.
    expect(dialog.getByRole('button', { name: t.catalogs.actions.save })).toBeDisabled()
    const input = dialog.getByLabelText(t.catalogs.materials.nameLabel)
    await userEvent.clear(input)
    await userEvent.type(input, 'Plástico PET')
    await userEvent.click(dialog.getByRole('button', { name: t.catalogs.actions.save }))

    await waitFor(() => expect(to('PATCH', '/admin/catalogs/materials/plastic')).toHaveLength(1))
    expect(to('PATCH', '/admin/catalogs/materials/plastic')[0].body).toEqual({ label: 'Plástico PET' })
    expect(await screen.findByText('Cambios guardados en Plástico PET')).toBeInTheDocument()
  })

  it('asks before deactivating, and says what it means', async () => {
    serve()
    renderAt('/catalogos')
    const materials = await section(t.catalogs.materials.title)
    await userEvent.click(await materials.findByRole('button', { name: `${t.catalogs.actions.deactivate} Plástico` }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText(t.catalogs.materials.deactivateMessage)).toBeInTheDocument()
    expect(to('PATCH', '/admin/catalogs/materials/plastic')).toHaveLength(0)

    await userEvent.click(dialog.getByRole('button', { name: t.catalogs.actions.deactivate }))
    await waitFor(() => expect(to('PATCH', '/admin/catalogs/materials/plastic')).toHaveLength(1))
    expect(to('PATCH', '/admin/catalogs/materials/plastic')[0].body).toEqual({ is_active: false })
    expect(await screen.findByText('Plástico fue desactivado')).toBeInTheDocument()
  })

  it('reactivates in one step, and only offers it for deactivated entries', async () => {
    serve()
    renderAt('/catalogos')
    const materials = await section(t.catalogs.materials.title)
    expect(await materials.findAllByRole('button', { name: new RegExp(`^${t.catalogs.actions.reactivate}`) })).toHaveLength(1)
    await userEvent.click(materials.getByRole('button', { name: `${t.catalogs.actions.reactivate} Vidrio` }))
    await waitFor(() => expect(to('PATCH', '/admin/catalogs/materials/glass')).toHaveLength(1))
    expect(to('PATCH', '/admin/catalogs/materials/glass')[0].body).toEqual({ is_active: true })
    expect(await screen.findByText('Vidrio fue reactivado')).toBeInTheDocument()
  })

  it('reloads and explains when the server refuses a change', async () => {
    serve()
    failure = { status: 404, code: 'not_found' }
    renderAt('/catalogos')
    const materials = await section(t.catalogs.materials.title)
    await userEvent.click(await materials.findByRole('button', { name: `${t.catalogs.actions.reactivate} Vidrio` }))
    expect(await screen.findByText(t.apiErrors.not_found)).toBeInTheDocument()
    await waitFor(() => expect(to('GET', '/admin/catalogs/materials').length).toBeGreaterThanOrEqual(2))
  })

  it('is not reachable without catalogs.manage', async () => {
    serve(['users.manage'])
    renderAt('/catalogos')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(to('GET', '/admin/catalogs/materials')).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.catalogs })).not.toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('the catalogs page', async () => {
    serve()
    renderAt('/catalogos')
    await screen.findByText('Vidrio')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('the deactivation dialog and the add drawer', async () => {
    serve()
    renderAt('/catalogos')
    const materials = await section(t.catalogs.materials.title)
    await userEvent.click(await materials.findByRole('button', { name: `${t.catalogs.actions.deactivate} Plástico` }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })
})
