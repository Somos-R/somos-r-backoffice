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

// The organizations module: read-only, to see who is on the platform, their people and their links.

const NOW = '2026-01-01T00:00:00Z'
const organization = (id: string, name: string, type: string, status: string, over: object = {}) => ({
  id, type, status, legal_name: name, tax_id: `900${id}`, city: 'Bogotá', contact_email: `${id}@x.co`, created_at: NOW,
  approved_at: status === 'approved' ? NOW : null, staff_count: 2, active_links: 1, ...over,
})

const ORGANIZATIONS = [
  organization('o1', 'ECA Norte', 'eca', 'approved'),
  organization('o2', 'Asociación Sur', 'association', 'approved', { staff_count: 3, active_links: 2 }),
  organization('o3', 'ECA Nueva', 'eca', 'in_review', { staff_count: 0, active_links: 0 }),
]

const person = (id: string, name: string, role: string, over: object = {}) => ({
  id, email: `${id}@x.co`, full_name: name, user_type_code: 'eca', role_code: role, organization_id: 'o1', is_active: true,
  verification_status: null, email_verified: true, locked: false, pending_activation: false, created_at: NOW, ...over,
})

const DETAILS: Record<string, object> = {
  o1: {
    legal_representative: 'Rosa Representante', contact_phone: '3001112233', address: 'Calle 1 # 2-3', updated_at: NOW,
    staff: [person('s1', 'Carla Operadora', 'eca_operator'), person('s2', 'Pedro Pendiente', 'eca_admin', { pending_activation: true })],
    links: [
      { id: 'l1', status: 'active', requested_at: NOW, decided_at: NOW, rejection_reason: null, other: { id: 'o2', type: 'association', legal_name: 'Asociación Sur', city: 'Cali' } },
      { id: 'l2', status: 'rejected', requested_at: NOW, decided_at: NOW, rejection_reason: 'No operan en esa zona', other: { id: 'o9', type: 'association', legal_name: 'Asociación Lejana', city: null } },
    ],
    recyclers_count: null,
    warehouses: [{ id: 'w1', name: 'Bodega Norte', is_active: true }, { id: 'w2', name: 'Bodega Vieja', is_active: false }],
  },
  o2: {
    legal_representative: null, contact_phone: null, address: null, updated_at: NOW, staff: [], links: [], recyclers_count: 42, warehouses: null,
  },
}

interface Recorded { method: string; url: string; params: Record<string, unknown> }
let requests: Recorded[]

const ROLES = [{ code: 'eca_operator', label: 'ECA · Operador de báscula', user_type_code: 'eca' }]

function serve(capabilities: string[] = ['organizations.review']) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const params = (c.params ?? {}) as Record<string, unknown>
    requests.push({ method: String(c.method).toUpperCase(), url, params })

    if (url === '/admin/me') {
      return { data: { id: 'me', email: 'me@somosr.co', full_name: 'Ana Plataforma', role_code: 'platform_admin', capabilities, mfa_enabled: true, recovery_codes_remaining: 8 } }
    }
    if (url === '/catalogs/roles') return { data: ROLES }
    if (url === '/admin/organizations') {
      const q = String(params.q ?? '').toLowerCase()
      const rows = ORGANIZATIONS.filter(
        (o) => (!params.type || o.type === params.type) && (!params.status || o.status === params.status) && (!q || o.legal_name.toLowerCase().includes(q)),
      )
      return { data: { total: rows.length, limit: 50, offset: 0, items: rows } }
    }
    const detail = url.match(/^\/admin\/organizations\/([^/]+)$/)
    if (detail) return { data: { ...ORGANIZATIONS.find((o) => o.id === detail[1])!, ...DETAILS[detail[1]] } }
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

const to = (url: string) => requests.filter((r) => r.method === 'GET' && r.url === url)
const openDetail = async (name: string) => {
  await userEvent.click(await screen.findByRole('button', { name: `${t.organizations.view} ${name}` }))
  return within(await screen.findByRole('dialog'))
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
})

describe('organizations list', () => {
  it('lists every organization with its stage, people and active links', async () => {
    serve()
    renderAt('/organizaciones')
    const row = await screen.findByRole('row', { name: /Asociación Sur/ })
    expect(within(row).getByText(t.organizations.types.association)).toBeInTheDocument()
    expect(within(row).getByText(t.organizations.status.approved)).toBeInTheDocument()
    expect(within(row).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /ECA Nueva/ })).getByText(t.organizations.status.in_review)).toBeInTheDocument()
    // Nothing is filtered by default.
    expect(to('/admin/organizations')[0].params.status).toBeUndefined()
  })

  it('filters by type, by status and by text (on the server)', async () => {
    serve()
    renderAt('/organizaciones')
    await screen.findByText('ECA Norte')

    await userEvent.click(screen.getByRole('combobox', { name: t.organizations.typeLabel }))
    await userEvent.click(await screen.findByRole('option', { name: t.organizations.types.association }))
    await waitFor(() => expect(to('/admin/organizations').some((r) => r.params.type === 'association')).toBe(true))

    await userEvent.click(screen.getByRole('combobox', { name: t.organizations.statusLabel }))
    await userEvent.click(await screen.findByRole('option', { name: t.organizations.status.in_review }))
    await waitFor(() => expect(to('/admin/organizations').some((r) => r.params.status === 'in_review')).toBe(true))

    await userEvent.type(screen.getByPlaceholderText(t.organizations.searchPlaceholder), 'Nueva')
    await waitFor(() => expect(to('/admin/organizations').some((r) => r.params.q === 'Nueva')).toBe(true))
  })

  it('is not reachable without organizations.review', async () => {
    serve(['users.manage'])
    renderAt('/organizaciones')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(to('/admin/organizations')).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.organizations })).not.toBeInTheDocument()
  })
})

describe('organization detail', () => {
  it('shows an ECA with its people, links and warehouses', async () => {
    serve()
    renderAt('/organizaciones')
    const detail = await openDetail('ECA Norte')
    expect(await detail.findByText('Rosa Representante')).toBeInTheDocument()
    // The roles come from the catalog, and a person invited but not yet active says so.
    expect(detail.getByText(/ECA · Operador de báscula/)).toBeInTheDocument()
    expect(within(detail.getByText('Pedro Pendiente').closest('li')!).getByText(t.users.status.pending)).toBeInTheDocument()
    expect(detail.getByText('Asociación Sur')).toBeInTheDocument()
    expect(detail.getByText('No operan en esa zona')).toBeInTheDocument()
    expect(detail.getByText('Bodega Norte')).toBeInTheDocument()
    expect(within(detail.getByText('Bodega Vieja').closest('li')!).getByText(t.organizations.detail.inactive)).toBeInTheDocument()
    // Recyclers are an Association's data, not an ECA's.
    expect(detail.queryByText(t.organizations.detail.recyclers)).not.toBeInTheDocument()
    // Opening it is audited by the server, so it is fetched every time.
    expect(to('/admin/organizations/o1')).toHaveLength(1)
  })

  it('shows an Association with its recyclers and no warehouses', async () => {
    serve()
    renderAt('/organizaciones')
    const detail = await openDetail('Asociación Sur')
    expect(await detail.findByText(t.organizations.detail.recyclers)).toBeInTheDocument()
    expect(detail.getByText('42')).toBeInTheDocument()
    expect(detail.getByText(t.organizations.detail.noStaff)).toBeInTheDocument()
    expect(detail.getByText(t.organizations.detail.noLinks)).toBeInTheDocument()
    expect(detail.queryByRole('region', { name: /Bodegas/ })).not.toBeInTheDocument()
  })

  it('has nothing to change: it is read-only', async () => {
    serve()
    renderAt('/organizaciones')
    const detail = await openDetail('ECA Norte')
    await detail.findByText('Rosa Representante')
    expect(detail.getAllByRole('button')).toHaveLength(2) // the title's close icon and "Cerrar"
  })
})

describe('accessibility', () => {
  it('the list', async () => {
    serve()
    renderAt('/organizaciones')
    await screen.findByText('ECA Norte')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('the detail of an ECA', async () => {
    serve()
    renderAt('/organizaciones')
    const detail = await openDetail('ECA Norte')
    await detail.findByText('Rosa Representante')
    await expectNoA11yViolations()
  })
})
