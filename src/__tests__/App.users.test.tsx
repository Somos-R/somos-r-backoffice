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

// The users module: find accounts, open one, and act on it.

const NOW = '2026-01-01T00:00:00Z'
const user = (id: string, name: string, type: string, role: string | null, over: object = {}) => ({
  id, email: `${id}@x.co`, full_name: name, user_type_code: type, role_code: role, organization_id: null,
  is_active: true, verification_status: null, email_verified: true, locked: false, pending_activation: false,
  created_at: NOW, ...over,
})

let USERS: ReturnType<typeof user>[]

const ROLES = [
  { code: 'eca_admin', label: 'ECA · Administrativo', user_type_code: 'eca' },
  { code: 'eca_operator', label: 'ECA · Operador de báscula', user_type_code: 'eca' },
  { code: 'association_admin', label: 'Asociación · Administrativo', user_type_code: 'association' },
]

interface Recorded { method: string; url: string; params: Record<string, unknown>; body: unknown }
let requests: Recorded[]
let statusFailure: { status: number; code: string } | null

function serve(capabilities: string[] = ['users.manage']) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const method = String(c.method).toUpperCase()
    const params = (c.params ?? {}) as Record<string, unknown>
    requests.push({ method, url, params, body: c.data ? JSON.parse(c.data) : undefined })

    if (url === '/admin/me') {
      return { data: { id: 'me', email: 'me@somosr.co', full_name: 'Ana Plataforma', role_code: 'platform_admin', capabilities, mfa_enabled: true, recovery_codes_remaining: 8 } }
    }
    if (url === '/catalogs/roles') return { data: ROLES }
    if (url === '/admin/users' && method === 'GET') {
      const q = String(params.q ?? '').toLowerCase()
      const rows = USERS.filter(
        (u) =>
          (!q || u.full_name.toLowerCase().includes(q)) &&
          (!params.user_type_code || u.user_type_code === params.user_type_code) &&
          (params.is_active === undefined || u.is_active === params.is_active) &&
          (params.locked === undefined || u.locked === params.locked) &&
          (params.pending_activation === undefined || u.pending_activation === params.pending_activation),
      )
      const limit = Number(params.limit ?? 50)
      const offset = Number(params.offset ?? 0)
      return { data: { total: rows.length, limit, offset, items: rows.slice(offset, offset + limit) } }
    }
    const detail = url.match(/^\/admin\/users\/([^/]+)$/)
    if (detail && method === 'GET') {
      const u = USERS.find((x) => x.id === detail[1])!
      return {
        data: {
          ...u, phone: '3001234567', id_type: 'CC', id_number: '1020304050', email_verified_at: NOW, updated_at: NOW,
          locked_until: u.locked ? '2026-01-02T00:00:00Z' : null, failed_login_attempts: u.locked ? 5 : 0, mfa_enabled: u.user_type_code === 'platform',
          organization_name: u.user_type_code === 'eca' ? 'ECA Norte' : null,
        },
      }
    }
    const action = url.match(/^\/admin\/users\/([^/]+)\/(status|unlock|sessions\/revoke|invitation\/resend|role)$/)
    if (action) {
      if (statusFailure && action[2] === 'status') return { status: statusFailure.status, data: { detail: 'x', code: statusFailure.code } }
      const u = USERS.find((x) => x.id === action[1])!
      const body = c.data ? JSON.parse(c.data) : {}
      if (action[2] === 'status') u.is_active = body.is_active
      if (action[2] === 'unlock') u.locked = false
      if (action[2] === 'role') u.role_code = body.role_code
      return { data: u }
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

const to = (method: string, url: string) => requests.filter((r) => r.method === method && r.url === url)
const openDetail = async (name: RegExp) => {
  await userEvent.click(within(await screen.findByRole('row', { name })).getByRole('button', { name: t.users.view }))
  return screen.findByRole('dialog', { name: undefined })
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
  statusFailure = null
  USERS = [
    user('me', 'Ana Plataforma', 'platform', 'platform_admin'),
    user('u1', 'Carla Operadora', 'eca', 'eca_operator'),
    user('u2', 'Pedro Pendiente', 'eca', 'eca_admin', { pending_activation: true }),
    user('u3', 'Dora Bloqueada', 'citizen', null, { locked: true }),
    user('u4', 'Inés Inactiva', 'association', 'association_admin', { is_active: false }),
    user('u5', 'Ramiro Reciclador', 'recycler', null, { verification_status: 'verified' }),
  ]
})

describe('users list', () => {
  it('shows every account with its type, role and state', async () => {
    serve()
    renderAt('/usuarios')
    expect(await screen.findByText('Carla Operadora')).toBeInTheDocument()
    expect(to('GET', '/admin/users')[0].params).toMatchObject({ limit: 25, offset: 0 })
    const carla = screen.getByRole('row', { name: /Carla Operadora/ })
    expect(within(carla).getByText('ECA')).toBeInTheDocument()
    expect(within(carla).getByText('ECA · Operador de báscula')).toBeInTheDocument()
    expect(within(carla).getByText(t.users.status.active)).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Pedro Pendiente/ })).getByText(t.users.status.pending)).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Dora Bloqueada/ })).getByText(t.users.status.locked)).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Inés Inactiva/ })).getByText(t.users.status.inactive)).toBeInTheDocument()
  })

  it('searches on the server, once per pause, and not for text the server would ignore', async () => {
    serve()
    renderAt('/usuarios')
    await screen.findByText('Carla Operadora')
    await userEvent.type(screen.getByPlaceholderText(t.users.searchPlaceholder), 'P')
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(to('GET', '/admin/users').every((r) => r.params.q === undefined)).toBe(true)

    await userEvent.type(screen.getByPlaceholderText(t.users.searchPlaceholder), 'edro')
    await waitFor(() => expect(to('GET', '/admin/users').at(-1)?.params).toMatchObject({ q: 'Pedro', offset: 0 }))
    expect(await screen.findByText('Pedro Pendiente')).toBeInTheDocument()
    expect(screen.queryByText('Carla Operadora')).not.toBeInTheDocument()
  })

  it('filters by type and by state', async () => {
    serve()
    renderAt('/usuarios')
    await screen.findByText('Carla Operadora')

    await userEvent.click(screen.getByRole('combobox', { name: t.users.typeLabel }))
    await userEvent.click(await screen.findByRole('option', { name: 'ECA' }))
    await waitFor(() => expect(to('GET', '/admin/users').at(-1)?.params).toMatchObject({ user_type_code: 'eca' }))

    await userEvent.click(screen.getByRole('combobox', { name: t.users.statusLabel }))
    await userEvent.click(await screen.findByRole('option', { name: t.users.filterStatus.pending }))
    await waitFor(() => expect(to('GET', '/admin/users').at(-1)?.params).toMatchObject({ user_type_code: 'eca', pending_activation: true }))
    expect(await screen.findByText('Pedro Pendiente')).toBeInTheDocument()
    expect(screen.queryByText('Carla Operadora')).not.toBeInTheDocument()
  })

  it('maps each state filter to what the server understands', async () => {
    serve()
    renderAt('/usuarios')
    await screen.findByText('Carla Operadora')
    for (const [label, expected] of [
      [t.users.filterStatus.inactive, { is_active: false }],
      [t.users.filterStatus.locked, { locked: true }],
      [t.users.filterStatus.active, { is_active: true }],
    ] as const) {
      await userEvent.click(screen.getByRole('combobox', { name: t.users.statusLabel }))
      await userEvent.click(await screen.findByRole('option', { name: label }))
      await waitFor(() => expect(to('GET', '/admin/users').at(-1)?.params).toMatchObject(expected))
    }
  })
})

describe('an account\'s detail and actions', () => {
  it('opens the full profile with its security state', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    expect(await screen.findByText('u1@x.co', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('ECA Norte')).toBeInTheDocument()
    expect(to('GET', '/admin/users/u1')).toHaveLength(1)
  })

  it('deactivates with an optional reason after confirming', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    await userEvent.click(await screen.findByRole('button', { name: t.users.actions.deactivate }))
    await userEvent.type(await screen.findByLabelText(t.users.confirm.reasonLabel), 'Dejó la organización')
    await userEvent.click(screen.getByRole('button', { name: t.users.confirm.deactivateButton }))

    await waitFor(() => expect(to('PATCH', '/admin/users/u1/status')).toHaveLength(1))
    expect(to('PATCH', '/admin/users/u1/status')[0].body).toEqual({ is_active: false, reason: 'Dejó la organización' })
    expect(await screen.findByText(t.users.messages.deactivated)).toBeInTheDocument()
    // The detail stays open and, once closed, the list behind it already shows the new state.
    const [closeButton] = await screen.findAllByRole('button', { name: t.users.detail.closeButton })
    await userEvent.click(closeButton)
    await waitFor(() => expect(within(screen.getByRole('row', { name: /Carla Operadora/ })).getByText(t.users.status.inactive)).toBeInTheDocument())
  })

  it('reactivates a deactivated account without asking for a reason', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Inés Inactiva/)
    await userEvent.click(await screen.findByRole('button', { name: t.users.actions.reactivate }))
    await userEvent.click(await screen.findByRole('button', { name: t.users.confirm.reactivateButton }))
    await waitFor(() => expect(to('PATCH', '/admin/users/u4/status')).toHaveLength(1))
    expect(to('PATCH', '/admin/users/u4/status')[0].body).toEqual({ is_active: true })
    expect(await screen.findByText(t.users.messages.reactivated)).toBeInTheDocument()
  })

  it('does not offer to deactivate the own account', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Ana Plataforma/)
    expect(await screen.findByText(t.users.detail.ownAccount)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.users.actions.deactivate })).not.toBeInTheDocument()
  })

  it('unlocks only accounts that are blocked', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    await screen.findByRole('button', { name: t.users.actions.revokeSessions })
    expect(screen.queryByRole('button', { name: t.users.actions.unlock })).not.toBeInTheDocument()
  })

  it('unlocks a blocked account', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Dora Bloqueada/)
    await userEvent.click(await screen.findByRole('button', { name: t.users.actions.unlock }))
    await waitFor(() => expect(to('POST', '/admin/users/u3/unlock')).toHaveLength(1))
    expect(await screen.findByText(t.users.messages.unlocked)).toBeInTheDocument()
  })

  it('resends the invitation only to someone who has not activated', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    await screen.findByRole('button', { name: t.users.actions.revokeSessions })
    expect(screen.queryByRole('button', { name: t.users.actions.resend })).not.toBeInTheDocument()
  })

  it('resends the invitation to a pending account', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Pedro Pendiente/)
    await userEvent.click(await screen.findByRole('button', { name: t.users.actions.resend }))
    await waitFor(() => expect(to('POST', '/admin/users/u2/invitation/resend')).toHaveLength(1))
    expect(await screen.findByText('Invitación reenviada a u2@x.co')).toBeInTheDocument()
  })

  it('signs the person out everywhere after confirming', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    await userEvent.click(await screen.findByRole('button', { name: t.users.actions.revokeSessions }))
    expect(to('POST', '/admin/users/u1/sessions/revoke')).toHaveLength(0) // not before confirming
    await userEvent.click(await screen.findByRole('button', { name: t.users.confirm.revokeButton }))
    await waitFor(() => expect(to('POST', '/admin/users/u1/sessions/revoke')).toHaveLength(1))
    expect(await screen.findByText(t.users.messages.revoked)).toBeInTheDocument()
  })

  it('changes the role of staff, offering only roles of their own kind of organization', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    const save = await screen.findByRole('button', { name: t.users.actions.saveRole })
    expect(save).toBeDisabled() // nothing changed yet
    await userEvent.click(screen.getByRole('combobox', { name: t.users.actions.roleLabel }))
    expect(screen.queryByRole('option', { name: 'Asociación · Administrativo' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('option', { name: 'ECA · Administrativo' }))
    await userEvent.click(save)
    await waitFor(() => expect(to('PATCH', '/admin/users/u1/role')).toHaveLength(1))
    expect(to('PATCH', '/admin/users/u1/role')[0].body).toEqual({ role_code: 'eca_admin' })
    expect(await screen.findByText(t.users.messages.roleChanged)).toBeInTheDocument()
  })

  it('does not offer a role change for accounts whose role is not editable', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Ramiro Reciclador/)
    await screen.findByRole('button', { name: t.users.actions.revokeSessions })
    expect(screen.queryByRole('combobox', { name: t.users.actions.roleLabel })).not.toBeInTheDocument()
  })

  it('shows the translated reason when the server refuses', async () => {
    serve()
    statusFailure = { status: 403, code: 'cannot_change_own_status' }
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    await userEvent.click(await screen.findByRole('button', { name: t.users.actions.deactivate }))
    await userEvent.click(await screen.findByRole('button', { name: t.users.confirm.deactivateButton }))
    expect(await screen.findByText(t.apiErrors.cannot_change_own_status)).toBeInTheDocument()
  })
})

describe('access', () => {
  it('is not reachable without users.manage', async () => {
    serve([])
    renderAt('/usuarios')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(to('GET', '/admin/users')).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.users })).not.toBeInTheDocument()
  })

  it('appears in the menu for accounts that can manage users', async () => {
    serve()
    renderAt('/')
    expect(await screen.findByRole('link', { name: t.nav.users })).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('list', async () => {
    serve()
    renderAt('/usuarios')
    await screen.findByText('Carla Operadora')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('detail dialog', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    await screen.findByRole('button', { name: t.users.actions.deactivate })
    await expectNoA11yViolations()
  })

  it('confirmation dialog', async () => {
    serve()
    renderAt('/usuarios')
    await openDetail(/Carla Operadora/)
    await userEvent.click(await screen.findByRole('button', { name: t.users.actions.deactivate }))
    await screen.findByLabelText(t.users.confirm.reasonLabel)
    await expectNoA11yViolations()
  })
})
