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

// The warehouses module: every ECA's warehouses, giving an owner to the ones without one (it never
// changes after), renaming and (de)activating. Nothing is created from here.

interface Warehouse { id: string; name: string; address: string | null; is_active: boolean; organization_id: string | null }

const NOW = '2026-10-01T10:00:00Z'
const eca = (id: string, legal_name: string, status: string) => ({
  id, type: 'eca', status, legal_name, tax_id: null, city: null, contact_email: null,
  created_at: NOW, approved_at: status === 'approved' ? NOW : null, staff_count: 1, active_links: 0,
})
const ECAS = [eca('e1', 'ECA Norte', 'approved'), eca('e2', 'ECA Sur', 'approved'), eca('e3', 'ECA Nueva', 'submitted')]

let WAREHOUSES: Warehouse[]

interface Recorded { method: string; url: string; body: unknown; params: Record<string, unknown> }
let requests: Recorded[]
let failure: { status: number; code: string } | null

function serve(capabilities: string[] = ['catalogs.manage', 'organizations.review']) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const method = String(c.method).toUpperCase()
    const body = c.data ? JSON.parse(c.data) : undefined
    const params = (c.params ?? {}) as Record<string, unknown>
    requests.push({ method, url, body, params })

    if (url === '/admin/me') {
      return { data: { id: 'me', email: 'me@somosr.co', full_name: 'Ana Plataforma', role_code: 'platform_admin', capabilities, mfa_enabled: true, recovery_codes_remaining: 8 } }
    }
    if (url === '/admin/organizations') {
      const items = ECAS.filter((o) => !params.type || o.type === params.type)
      return { data: { total: items.length, limit: params.limit, offset: 0, items } }
    }
    if (url === '/admin/warehouses') {
      const items = WAREHOUSES.filter((w) =>
        params.unassigned === undefined || (params.unassigned ? w.organization_id === null : w.organization_id !== null))
      const offset = Number(params.offset ?? 0)
      const limit = Number(params.limit ?? 50)
      return { data: { total: items.length, limit, offset, items: items.slice(offset, offset + limit) } }
    }
    const route = url.match(/^\/admin\/warehouses\/([^/]+)(\/organization)?$/)
    if (!route) return { data: {} }
    if (failure) return { status: failure.status, data: { detail: 'x', code: failure.code } }
    const warehouse = WAREHOUSES.find((w) => w.id === route[1])!
    if (route[2]) warehouse.organization_id = body.organization_id
    else Object.assign(warehouse, body)
    return { data: warehouse }
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
const row = (name: RegExp) => screen.findByRole('row', { name })

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
  failure = null
  WAREHOUSES = [
    { id: 'w1', name: 'Bodega Centro', address: 'Calle 1 # 2-3', is_active: true, organization_id: 'e1' },
    { id: 'w2', name: 'Bodega Huérfana', address: null, is_active: true, organization_id: null },
    { id: 'w3', name: 'Bodega Vieja', address: null, is_active: false, organization_id: 'gone' },
  ]
})

describe('warehouses screen', () => {
  it('lists every warehouse with its owner by name, its address and its state', async () => {
    serve()
    renderAt('/bodegas')
    const centro = await row(/Bodega Centro/)
    expect(await within(centro).findByText('ECA Norte')).toBeInTheDocument()
    expect(within(centro).getByText('Calle 1 # 2-3')).toBeInTheDocument()
    expect(within(centro).getByText(t.warehouses.status.active)).toBeInTheDocument()

    expect(within(await row(/Bodega Huérfana/)).getByText(t.warehouses.noOwner)).toBeInTheDocument()
    const vieja = await row(/Bodega Vieja/)
    expect(within(vieja).getByText(t.warehouses.unknownOwner)).toBeInTheDocument()
    expect(within(vieja).getByText(t.warehouses.status.inactive)).toBeInTheDocument()
    expect(screen.getByText(`3 ${t.warehouses.countPlural}`)).toBeInTheDocument()

    // Owners are named from one request for every ECA, not one per row.
    expect(to('GET', '/admin/organizations')).toHaveLength(1)
    expect(to('GET', '/admin/organizations')[0].params).toMatchObject({ type: 'eca', limit: 200 })
  })

  it('filters the warehouses without an owner on the server', async () => {
    serve()
    renderAt('/bodegas')
    await row(/Bodega Centro/)
    await userEvent.click(screen.getByLabelText(t.warehouses.ownerLabel))
    await userEvent.click(await screen.findByRole('option', { name: t.warehouses.ownerFilter.unassigned }))

    await waitFor(() => expect(screen.queryByRole('row', { name: /Bodega Centro/ })).not.toBeInTheDocument())
    expect(screen.getByRole('row', { name: /Bodega Huérfana/ })).toBeInTheDocument()
    expect(to('GET', '/admin/warehouses').at(-1)!.params).toEqual({ unassigned: true, limit: 25, offset: 0 })
  })

  it('offers "assign" only on warehouses without an owner, and only approved ECAs', async () => {
    serve()
    renderAt('/bodegas')
    await row(/Bodega Centro/)
    expect(await screen.findAllByRole('button', { name: new RegExp(`^${t.warehouses.actions.assign}`) })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: `${t.warehouses.actions.assign} Bodega Huérfana` }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText(t.warehouses.assign.warning)).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: t.warehouses.assign.confirm })).toBeDisabled()

    await userEvent.click(dialog.getByLabelText(new RegExp(t.warehouses.assign.ecaLabel)))
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(options).toEqual(['ECA Norte', 'ECA Sur'])
  })

  it('assigns the owner and reloads the list', async () => {
    serve()
    renderAt('/bodegas')
    await userEvent.click(await screen.findByRole('button', { name: `${t.warehouses.actions.assign} Bodega Huérfana` }))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByLabelText(new RegExp(t.warehouses.assign.ecaLabel)))
    await userEvent.click(await screen.findByRole('option', { name: 'ECA Sur' }))
    const listsBefore = to('GET', '/admin/warehouses').length
    await userEvent.click(dialog.getByRole('button', { name: t.warehouses.assign.confirm }))

    await waitFor(() => expect(to('PUT', '/admin/warehouses/w2/organization')).toHaveLength(1))
    expect(to('PUT', '/admin/warehouses/w2/organization')[0].body).toEqual({ organization_id: 'e2' })
    expect(await screen.findByText('Bodega Huérfana ahora es de ECA Sur')).toBeInTheDocument()
    await waitFor(() => expect(to('GET', '/admin/warehouses').length).toBeGreaterThan(listsBefore))
    expect(within(await row(/Bodega Huérfana/)).getByText('ECA Sur')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `${t.warehouses.actions.assign} Bodega Huérfana` })).not.toBeInTheDocument()
  })

  it('explains and reloads when someone else gave it an owner first', async () => {
    serve()
    failure = { status: 409, code: 'already_owned' }
    renderAt('/bodegas')
    await userEvent.click(await screen.findByRole('button', { name: `${t.warehouses.actions.assign} Bodega Huérfana` }))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByLabelText(new RegExp(t.warehouses.assign.ecaLabel)))
    await userEvent.click(await screen.findByRole('option', { name: 'ECA Norte' }))
    const listsBefore = to('GET', '/admin/warehouses').length
    await userEvent.click(dialog.getByRole('button', { name: t.warehouses.assign.confirm }))

    expect(await screen.findByText(t.apiErrors.already_owned)).toBeInTheDocument()
    await waitFor(() => expect(to('GET', '/admin/warehouses').length).toBeGreaterThan(listsBefore))
  })

  it('edits the name and clears the address, sending only what changed', async () => {
    serve()
    renderAt('/bodegas')
    await userEvent.click(await screen.findByRole('button', { name: `${t.warehouses.actions.edit} Bodega Centro` }))
    const drawer = within(await screen.findByRole('presentation'))
    const name = drawer.getByLabelText(new RegExp(t.warehouses.edit.nameLabel))
    expect(name).toHaveValue('Bodega Centro')
    await userEvent.clear(name)
    await userEvent.type(name, ' Bodega Central ')
    await userEvent.clear(drawer.getByLabelText(t.warehouses.edit.addressLabel))
    await userEvent.click(drawer.getByRole('button', { name: t.ui.formDrawer.save }))

    await waitFor(() => expect(to('PATCH', '/admin/warehouses/w1')).toHaveLength(1))
    expect(to('PATCH', '/admin/warehouses/w1')[0].body).toEqual({ name: 'Bodega Central', address: null })
    expect(await screen.findByText('Cambios guardados en Bodega Central')).toBeInTheDocument()
  })

  it('sends nothing when the form did not change', async () => {
    serve()
    renderAt('/bodegas')
    await userEvent.click(await screen.findByRole('button', { name: `${t.warehouses.actions.edit} Bodega Centro` }))
    const drawer = within(await screen.findByRole('presentation'))
    await userEvent.click(drawer.getByRole('button', { name: t.ui.formDrawer.save }))
    await waitFor(() => expect(screen.queryByRole('presentation')).not.toBeInTheDocument())
    expect(to('PATCH', '/admin/warehouses/w1')).toHaveLength(0)
  })

  it('asks before deactivating, and says what it means', async () => {
    serve()
    renderAt('/bodegas')
    await userEvent.click(await screen.findByRole('button', { name: `${t.warehouses.actions.deactivate} Bodega Centro` }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText(t.warehouses.deactivate.message)).toBeInTheDocument()
    expect(to('PATCH', '/admin/warehouses/w1')).toHaveLength(0)

    await userEvent.click(dialog.getByRole('button', { name: t.warehouses.actions.deactivate }))
    await waitFor(() => expect(to('PATCH', '/admin/warehouses/w1')).toHaveLength(1))
    expect(to('PATCH', '/admin/warehouses/w1')[0].body).toEqual({ is_active: false })
    expect(await screen.findByText('Bodega Centro fue desactivada')).toBeInTheDocument()
  })

  it('reactivates in one step', async () => {
    serve()
    renderAt('/bodegas')
    await userEvent.click(await screen.findByRole('button', { name: `${t.warehouses.actions.reactivate} Bodega Vieja` }))
    await waitFor(() => expect(to('PATCH', '/admin/warehouses/w3')).toHaveLength(1))
    expect(to('PATCH', '/admin/warehouses/w3')[0].body).toEqual({ is_active: true })
    expect(await screen.findByText('Bodega Vieja fue reactivada')).toBeInTheDocument()
  })

  it('without organizations.review, lists warehouses but neither names nor assigns owners', async () => {
    serve(['catalogs.manage'])
    renderAt('/bodegas')
    await row(/Bodega Huérfana/)
    expect(screen.getByText(t.warehouses.ownersUnavailable)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: new RegExp(`^${t.warehouses.actions.assign}`) })).not.toBeInTheDocument()
    expect(to('GET', '/admin/organizations')).toHaveLength(0)
  })

  it('is not reachable without catalogs.manage', async () => {
    serve(['organizations.review'])
    renderAt('/bodegas')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(to('GET', '/admin/warehouses')).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.warehouses })).not.toBeInTheDocument()
  })

  it('is in the menu with catalogs.manage', async () => {
    serve()
    renderAt('/')
    expect(await screen.findByRole('link', { name: t.nav.warehouses })).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('the warehouses page', async () => {
    serve()
    renderAt('/bodegas')
    await screen.findByText('ECA Norte')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('the assign and deactivate dialogs, and the edit drawer', async () => {
    serve()
    renderAt('/bodegas')
    await userEvent.click(await screen.findByRole('button', { name: `${t.warehouses.actions.assign} Bodega Huérfana` }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
    await userEvent.click(screen.getByRole('button', { name: t.warehouses.actions.keep }))

    await userEvent.click(screen.getByRole('button', { name: `${t.warehouses.actions.deactivate} Bodega Centro` }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
    await userEvent.click(screen.getByRole('button', { name: t.warehouses.actions.keep }))

    await userEvent.click(screen.getByRole('button', { name: `${t.warehouses.actions.edit} Bodega Centro` }))
    await screen.findByRole('presentation')
    await expectNoA11yViolations()
  })
})
