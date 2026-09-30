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

// The audit viewer: read the trail, filter it deliberately (every read is itself audited), inspect one event.

const ACTOR = '11111111-2222-3333-4444-555555555555'
const TARGET = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

const ACTIONS = ['auth.login', 'user.deactivated', 'admin.audit_viewed', 'weighing.validated']
const event = (i: number) => ({
  id: `e${String(i).padStart(3, '0')}-0000-0000-0000-000000000000`,
  occurred_at: `2026-01-${String(1 + (i % 28)).padStart(2, '0')}T10:00:00Z`,
  action: i === 0 ? 'brand.new_action' : ACTIONS[i % ACTIONS.length],
  outcome: i % 5 === 0 ? 'failure' : 'success',
  actor_id: i === 1 ? null : ACTOR,
  actor_role: i === 1 ? null : 'platform_admin',
  target_type: 'user',
  target_id: TARGET,
  ip: '10.0.0.1',
  request_id: `req-${i}`,
  details: i === 2 ? { previous_role: 'eca_operator', new_role: 'eca_admin' } : {},
})
const EVENTS = Array.from({ length: 60 }, (_, i) => event(i))

interface Recorded { method: string; url: string; params: Record<string, unknown> }
let requests: Recorded[]

function serve(capabilities: string[] = ['audit.read']) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const params = (c.params ?? {}) as Record<string, unknown>
    requests.push({ method: String(c.method).toUpperCase(), url, params })
    if (url === '/admin/me') {
      return { data: { id: 'me', email: 'me@somosr.co', full_name: 'Ana Plataforma', role_code: 'platform_admin', capabilities, mfa_enabled: true, recovery_codes_remaining: 8 } }
    }
    if (url === '/catalogs/roles') return { data: [] }
    if (url === '/admin/audit-log') {
      const rows = EVENTS.filter((e) => (!params.action || e.action === params.action) && (!params.outcome || e.outcome === params.outcome))
      const limit = Number(params.limit ?? 50)
      const offset = Number(params.offset ?? 0)
      return { data: { total: rows.length, limit, offset, items: rows.slice(offset, offset + limit) } }
    }
    return { data: {} }
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

const reads = () => requests.filter((r) => r.url === '/admin/audit-log')
const lastRead = () => reads().at(-1)
const apply = () => userEvent.click(screen.getByRole('button', { name: t.audit.filters.apply }))
const pickOption = async (combobox: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: combobox }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
})

describe('audit list', () => {
  it('shows the newest events with readable actions, outcome, actor and target', async () => {
    serve()
    renderAt('/auditoria')
    expect(await screen.findByRole('heading', { level: 1, name: t.audit.title })).toBeInTheDocument()
    await screen.findAllByText('Consulta del registro de auditoría')
    expect(reads()).toHaveLength(1)
    expect(lastRead()!.params).toEqual({ limit: 25, offset: 0 }) // no filter is sent until one is set

    expect(screen.getByText(t.audit.readNotice)).toBeInTheDocument()
    expect(screen.getAllByText(t.audit.outcome.failure).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Somos R · Administrador').length).toBeGreaterThan(0)
    expect(screen.getAllByText(TARGET.slice(0, 8)).length).toBeGreaterThan(0)
  })

  it('shows an action this build does not know as its raw code, and a missing actor as the system', async () => {
    serve()
    renderAt('/auditoria')
    expect(await screen.findByText('brand.new_action')).toBeInTheDocument()
    expect(screen.getByText(t.audit.system)).toBeInTheDocument()
  })

  it('pages through the trail', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
    await waitFor(() => expect(lastRead()!.params).toMatchObject({ limit: 25, offset: 25 }))
  })
})

describe('filters', () => {
  it('are not sent while the person is choosing them, only when applied', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await pickOption(t.audit.filters.action, 'Ingreso')
    await pickOption(t.audit.filters.outcome, t.audit.outcome.failure)
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(reads()).toHaveLength(1) // nothing new: choosing is not reading

    await apply()
    await waitFor(() => expect(reads()).toHaveLength(2))
    expect(lastRead()!.params).toMatchObject({ action: 'auth.login', outcome: 'failure', offset: 0 })
  })

  it('send the dates as whole days: from the start of the first to the end of the last', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await userEvent.type(screen.getByLabelText(t.audit.filters.since), '2026-01-05')
    await userEvent.type(screen.getByLabelText(t.audit.filters.until), '2026-01-06')
    await apply()
    await waitFor(() => expect(reads()).toHaveLength(2))
    expect(lastRead()!.params.since).toBe(new Date('2026-01-05T00:00:00').toISOString())
    expect(lastRead()!.params.until).toBe(new Date('2026-01-06T23:59:59.999').toISOString())
  })

  it('refuse a range that ends before it starts', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await userEvent.type(screen.getByLabelText(t.audit.filters.since), '2026-01-10')
    await userEvent.type(screen.getByLabelText(t.audit.filters.until), '2026-01-05')
    expect(await screen.findByText(t.audit.filters.invalidRange)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.audit.filters.apply })).toBeDisabled()
    expect(reads()).toHaveLength(1)
  })

  it('open the advanced ones on demand and send them', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    expect(screen.queryByLabelText(t.audit.filters.actorId)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t.audit.filters.more }))
    await userEvent.type(screen.getByLabelText(t.audit.filters.actorId), ACTOR)
    await userEvent.type(screen.getByLabelText(t.audit.filters.organizationId), 'org-1')
    await userEvent.type(screen.getByLabelText(t.audit.filters.requestId), 'req-7')
    await apply()
    await waitFor(() => expect(reads()).toHaveLength(2))
    expect(lastRead()!.params).toMatchObject({ actor_id: ACTOR, organization_id: 'org-1', request_id: 'req-7' })
  })

  it('go back to the first page when applied, and clear everything', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
    await waitFor(() => expect(lastRead()!.params).toMatchObject({ offset: 25 }))

    await pickOption(t.audit.filters.outcome, t.audit.outcome.success)
    await apply()
    await waitFor(() => expect(lastRead()!.params).toMatchObject({ outcome: 'success', offset: 0 }))

    const before = reads().length
    await userEvent.click(screen.getByRole('button', { name: t.audit.filters.clear }))
    // Back to the unfiltered first page, which was read moments ago: shown again, not read again.
    expect(await screen.findByText('brand.new_action')).toBeInTheDocument()
    expect(reads()).toHaveLength(before)
  })

  it('show an empty message when nothing matches', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await pickOption(t.audit.filters.action, 'Inventario actualizado')
    await apply()
    expect(await screen.findByText(t.audit.empty)).toBeInTheDocument()
  })
})

describe('reading is audited, so it is never automatic', () => {
  it('does not read again when the tab gets focus back', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(reads()).toHaveLength(1)
  })

  it('does not read again when reopening the screen a moment later', async () => {
    serve()
    const first = renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    first.unmount()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    expect(reads()).toHaveLength(1)
  })
})

describe('an event\'s detail', () => {
  it('shows everything the server recorded, without another request', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    const target = screen.getAllByRole('row').find((r) => r.textContent?.includes('auth.login'))!
    await userEvent.click(within(target).getByRole('button', { name: t.audit.view }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(ACTOR)).toBeInTheDocument() // the whole id, not the short one
    expect(within(dialog).getByText('10.0.0.1')).toBeInTheDocument()
    expect(within(dialog).getByText(t.audit.detail.noDetails)).toBeInTheDocument()
    expect(reads()).toHaveLength(1)
  })

  it('shows the event data as text', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    const rows = screen.getAllByRole('row')
    const target = rows.find((r) => r.textContent?.includes('admin.audit_viewed'))!
    await userEvent.click(within(target).getByRole('button', { name: t.audit.view }))
    const dialog = await screen.findByRole('dialog')
    // The first audit_viewed row is event 2, the one with details.
    expect(dialog.textContent).toContain('previous_role')
    expect(dialog.textContent).toContain('eca_admin')
  })
})

describe('refreshing', () => {
  it('reads again only when asked to', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    expect(reads()).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: t.audit.refresh }))
    await waitFor(() => expect(reads()).toHaveLength(2))
  })
})

describe('access', () => {
  it('is not reachable without audit.read', async () => {
    serve([])
    renderAt('/auditoria')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(reads()).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.audit })).not.toBeInTheDocument()
  })

  it('appears in the menu for accounts that can read the trail', async () => {
    serve()
    renderAt('/')
    expect(await screen.findByRole('link', { name: t.nav.audit })).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('list with the filters', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('list with the advanced filters open', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    await userEvent.click(screen.getByRole('button', { name: t.audit.filters.more }))
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('event detail', async () => {
    serve()
    renderAt('/auditoria')
    await screen.findByText('brand.new_action')
    const target = screen.getAllByRole('row').find((r) => r.textContent?.includes('admin.audit_viewed'))!
    await userEvent.click(within(target).getByRole('button', { name: t.audit.view }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })
})
