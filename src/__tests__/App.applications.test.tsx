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

// The applications module: the review queue of organizations asking to join, and the decision on each.

const NOW = '2026-01-01T00:00:00Z'
const summary = (id: string, name: string, status: string, over: object = {}) => ({
  id, type: 'eca', status, legal_name: name, tax_id: `900${id}`, city: 'Bogotá', applicant_name: `Solicitante ${id}`,
  applicant_email: `${id}@x.co`, submitted_at: NOW, submission_count: 1, review_started_at: null, reviewer: null, ...over,
})

let APPLICATIONS: ReturnType<typeof summary>[]

const upload = (id: string, status: string, over: object = {}) => ({
  id, original_name: `${id}.pdf`, content_type: 'application/pdf', size_bytes: 250_000, uploaded_at: NOW, status,
  review_comment: null, reviewed_at: null, reviewed_by: null, ...over,
})
// Every application asks for the same two documents; what was uploaded varies by application.
let UPLOADS: Record<string, { rut: ReturnType<typeof upload> | null; rep: ReturnType<typeof upload> | null }>
const slots = (id: string) => [
  { document_type: { code: 'eca_rut', label: 'RUT', is_required: true }, document: UPLOADS[id]?.rut ?? null },
  { document_type: { code: 'eca_rep', label: 'Cédula del representante', is_required: true }, document: UPLOADS[id]?.rep ?? null },
]

interface Recorded { method: string; url: string; params: Record<string, unknown>; body: unknown }
let requests: Recorded[]
let failure: { status: number; code: string } | null

function serve(capabilities: string[] = ['organizations.review']) {
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    const method = String(c.method).toUpperCase()
    const params = (c.params ?? {}) as Record<string, unknown>
    const body = c.data ? JSON.parse(c.data) : undefined
    requests.push({ method, url, params, body })

    if (url === '/admin/me') {
      return { data: { id: 'me', email: 'me@somosr.co', full_name: 'Ana Plataforma', role_code: 'platform_admin', capabilities, mfa_enabled: true, recovery_codes_remaining: 8 } }
    }
    if (url === '/admin/applications' && method === 'GET') {
      const q = String(params.q ?? '').toLowerCase()
      const rows = APPLICATIONS.filter(
        (a) =>
          (params.status ? a.status === params.status : ['submitted', 'in_review', 'changes_requested'].includes(a.status)) &&
          (!params.type || a.type === params.type) &&
          (!q || a.legal_name.toLowerCase().includes(q)),
      )
      return { data: { total: rows.length, limit: 50, offset: 0, items: rows } }
    }
    const doc = url.match(/^\/admin\/applications\/([^/]+)\/documents\/([^/]+)(\/access)?$/)
    if (doc) {
      if (failure) return { status: failure.status, data: { detail: 'x', code: failure.code } }
      if (doc[3]) return { data: { url: `/admin/documents/download/token-${doc[2]}`, expires_at: NOW } }
      const entry = Object.values(UPLOADS[doc[1]]).find((u) => u?.id === doc[2])!
      Object.assign(entry, { status: body.status, review_comment: body.comment ?? null })
      return { data: slots(doc[1]).find((s) => s.document?.id === doc[2]) }
    }
    const route = url.match(/^\/admin\/applications\/([^/]+)(?:\/(start-review|decision))?$/)
    if (route) {
      const application = APPLICATIONS.find((a) => a.id === route[1])!
      if (route[2] && failure) return { status: failure.status, data: { detail: 'x', code: failure.code } }
      if (route[2] === 'start-review') Object.assign(application, { status: 'in_review', reviewer: { id: 'me', full_name: 'Ana Plataforma' } })
      if (route[2] === 'decision') {
        application.status = { approve: 'approved', request_changes: 'changes_requested', reject: 'rejected' }[body.decision as string]!
      }
      return {
        data: {
          ...application, legal_representative: 'Rosa Representante', contact_email: 'contacto@x.co', contact_phone: '3001112233',
          address: 'Calle 1 # 2-3', applicant_id_type: 'CC', applicant_id_number: '1020304050', applicant_phone: '3009998877',
          email_verified_at: NOW, consent_at: NOW, consent_version: 'v1', documents: slots(application.id),
          reviews: application.id === 'a3'
            ? [{ id: 'rv1', decision: 'changes_requested', summary: 'Falta el RUT actualizado', submission_number: 1, details: [{ code: 'eca_rut', label: 'RUT', status: 'not_compliant', comment: 'Está ilegible' }], created_at: NOW, reviewer: { id: 'p2', full_name: 'Luis Revisor' } }]
            : [],
        },
      }
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
const openDetail = async (name: string) => {
  await userEvent.click(await screen.findByRole('button', { name: `${t.applications.view} ${name}` }))
  return within(await screen.findByRole('dialog'))
}
const openDecision = async (detail: ReturnType<typeof within>) => {
  await userEvent.click(await detail.findByRole('button', { name: t.applications.actions.decide }))
  return within(await screen.findByRole('dialog', { name: t.applications.decision.title }))
}
const choose = async (decision: ReturnType<typeof within>, option: string) => {
  await userEvent.click(decision.getByRole('combobox', { name: t.applications.decision.label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  requests = []
  failure = null
  UPLOADS = {
    a1: { rut: upload('d1', 'pending'), rep: null },
    a2: { rut: upload('d2', 'ok'), rep: upload('d3', 'ok') },
    a3: { rut: upload('d4', 'not_compliant', { review_comment: 'Está ilegible' }), rep: upload('d5', 'ok') },
  }
  APPLICATIONS = [
    summary('a1', 'ECA Norte', 'submitted'),
    summary('a2', 'Asociación Sur', 'in_review', { type: 'association', reviewer: { id: 'p2', full_name: 'Luis Revisor' } }),
    summary('a3', 'ECA Reenviada', 'changes_requested', { submission_count: 2 }),
    summary('a4', 'ECA Vieja', 'approved'),
  ]
})

describe('applications queue', () => {
  it('starts on the open queue and shows who reviews each one', async () => {
    serve()
    renderAt('/solicitudes')
    expect(await screen.findByText('ECA Norte')).toBeInTheDocument()
    // No status is sent: the server's default is the queue.
    expect(to('GET', '/admin/applications')[0].params.status).toBeUndefined()
    expect(screen.queryByText('ECA Vieja')).not.toBeInTheDocument()
    const row = screen.getByRole('row', { name: /Asociación Sur/ })
    expect(within(row).getByText(t.applications.status.in_review)).toBeInTheDocument()
    expect(within(row).getByText('Luis Revisor')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /ECA Reenviada/ })).getByText('Envío 2')).toBeInTheDocument()
  })

  it('filters by status, by type and by text (on the server)', async () => {
    serve()
    renderAt('/solicitudes')
    await screen.findByText('ECA Norte')

    await userEvent.click(screen.getByRole('combobox', { name: t.applications.statusLabel }))
    await userEvent.click(await screen.findByRole('option', { name: t.applications.status.approved }))
    expect(await screen.findByText('ECA Vieja')).toBeInTheDocument()
    expect(to('GET', '/admin/applications').some((r) => r.params.status === 'approved')).toBe(true)

    await userEvent.click(screen.getByRole('combobox', { name: t.applications.typeLabel }))
    await userEvent.click(await screen.findByRole('option', { name: t.applications.types.association }))
    await waitFor(() => expect(to('GET', '/admin/applications').some((r) => r.params.type === 'association')).toBe(true))

    await userEvent.type(screen.getByPlaceholderText(t.applications.searchPlaceholder), 'Sur')
    await waitFor(() => expect(to('GET', '/admin/applications').some((r) => r.params.q === 'Sur')).toBe(true))
  })

  it('is not reachable without organizations.review', async () => {
    serve(['users.manage'])
    renderAt('/solicitudes')
    expect(await screen.findByText(t.forbidden.title)).toBeInTheDocument()
    expect(to('GET', '/admin/applications')).toHaveLength(0)
    expect(screen.queryByRole('link', { name: t.nav.applications })).not.toBeInTheDocument()
  })
})

describe('application detail', () => {
  it('shows the organization, who applies, consent and earlier decisions', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Reenviada')
    expect(await detail.findByText('Rosa Representante')).toBeInTheDocument()
    expect(detail.getByText('CC 1020304050')).toBeInTheDocument()
    expect(detail.getByText(/v1/)).toBeInTheDocument()
    expect(detail.getByText('Falta el RUT actualizado')).toBeInTheDocument()
    expect(detail.getByText(t.applications.detail.decisions.changes_requested)).toBeInTheDocument()
    expect(to('GET', '/admin/applications/a3')).toHaveLength(1)
  })

  it('takes a submitted application for review, and only offers that when it is submitted', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Norte')
    await userEvent.click(await detail.findByRole('button', { name: t.applications.actions.startReview }))
    await waitFor(() => expect(to('POST', '/admin/applications/a1/start-review')).toHaveLength(1))
    expect(await screen.findByText(t.applications.messages.taken)).toBeInTheDocument()
    await waitFor(() => expect(detail.queryByRole('button', { name: t.applications.actions.startReview })).not.toBeInTheDocument())
  })

  it('explains when someone else already took it', async () => {
    serve()
    failure = { status: 409, code: 'already_in_review' }
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Norte')
    await userEvent.click(await detail.findByRole('button', { name: t.applications.actions.startReview }))
    expect(await screen.findByText(t.apiErrors.already_in_review)).toBeInTheDocument()
  })

  it('says who holds an application someone else took', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('Asociación Sur')
    expect(await detail.findByText('Luis Revisor ya tomó esta solicitud.')).toBeInTheDocument()
  })

  it('offers no decision on an application that is already closed', async () => {
    serve()
    renderAt('/solicitudes')
    await userEvent.click(await screen.findByRole('combobox', { name: t.applications.statusLabel }))
    await userEvent.click(await screen.findByRole('option', { name: t.applications.status.approved }))
    const detail = await openDetail('ECA Vieja')
    await detail.findByText('Rosa Representante')
    expect(detail.queryByRole('button', { name: t.applications.actions.decide })).not.toBeInTheDocument()
  })
})

describe('deciding', () => {
  it('approves without a summary once every required document is approved', async () => {
    serve()
    renderAt('/solicitudes')
    const decision = await openDecision(await openDetail('Asociación Sur'))
    await userEvent.click(decision.getByRole('button', { name: t.applications.decision.confirm.approve }))
    await waitFor(() => expect(to('POST', '/admin/applications/a2/decision')).toHaveLength(1))
    expect(to('POST', '/admin/applications/a2/decision')[0].body).toEqual({ decision: 'approve' })
    expect(await screen.findByText(t.applications.messages.approve)).toBeInTheDocument()
  })

  it('does not ask for changes or reject without a summary of enough length', async () => {
    serve()
    renderAt('/solicitudes')
    const decision = await openDecision(await openDetail('ECA Norte'))
    await choose(decision, t.applications.decision.options.request_changes)
    await userEvent.type(decision.getByLabelText(t.applications.decision.summaryRequired), 'corto')
    await userEvent.click(decision.getByRole('button', { name: t.applications.decision.confirm.request_changes }))
    expect(await decision.findByText('Escribe al menos 10 caracteres.')).toBeInTheDocument()
    expect(to('POST', '/admin/applications/a1/decision')).toHaveLength(0)

    await userEvent.type(decision.getByLabelText(t.applications.decision.summaryRequired), ' y falta el RUT vigente ')
    await userEvent.click(decision.getByRole('button', { name: t.applications.decision.confirm.request_changes }))
    await waitFor(() => expect(to('POST', '/admin/applications/a1/decision')).toHaveLength(1))
    expect(to('POST', '/admin/applications/a1/decision')[0].body).toEqual({ decision: 'request_changes', summary: 'corto y falta el RUT vigente' })
    expect(await screen.findByText(t.applications.messages.request_changes)).toBeInTheDocument()
  })

  it('rejects with the summary', async () => {
    serve()
    renderAt('/solicitudes')
    const decision = await openDecision(await openDetail('ECA Norte'))
    await choose(decision, t.applications.decision.options.reject)
    await userEvent.type(decision.getByLabelText(t.applications.decision.summaryRequired), 'No cumple los requisitos de habilitación')
    await userEvent.click(decision.getByRole('button', { name: t.applications.decision.confirm.reject }))
    await waitFor(() => expect(to('POST', '/admin/applications/a1/decision')).toHaveLength(1))
    expect(to('POST', '/admin/applications/a1/decision')[0].body).toEqual({ decision: 'reject', summary: 'No cumple los requisitos de habilitación' })
    expect(await screen.findByText(t.applications.messages.reject)).toBeInTheDocument()
  })

  it('explains why an approval was refused and reloads the queue', async () => {
    serve()
    failure = { status: 409, code: 'documents_not_approved' }
    renderAt('/solicitudes')
    const decision = await openDecision(await openDetail('Asociación Sur'))
    await userEvent.click(decision.getByRole('button', { name: t.applications.decision.confirm.approve }))
    expect(await screen.findByText(t.apiErrors.documents_not_approved)).toBeInTheDocument()
    await waitFor(() => expect(to('GET', '/admin/applications').length).toBeGreaterThanOrEqual(2))
  })
})

describe('documents', () => {
  it('shows each requested document with its state, and the ones not uploaded', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Norte')
    const documents = within(await detail.findByRole('region', { name: t.applications.documents.title }))
    expect(documents.getByText('d1.pdf · 244 KB · cargado', { exact: false })).toBeInTheDocument()
    expect(documents.getByText(t.applications.documents.status.pending)).toBeInTheDocument()
    expect(documents.getByText(t.applications.documents.notUploaded)).toBeInTheDocument()
    // There is nothing to open or judge for a document that was not uploaded.
    expect(documents.queryByRole('button', { name: `${t.applications.documents.open} Cédula del representante` })).not.toBeInTheDocument()
  })

  it('opens a file through a signed link, in a new tab', async () => {
    serve()
    const opened: unknown[][] = []
    window.open = ((...args: unknown[]) => { opened.push(args); return null }) as typeof window.open
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Norte')
    await userEvent.click(await detail.findByRole('button', { name: `${t.applications.documents.open} RUT` }))
    await waitFor(() => expect(to('POST', '/admin/applications/a1/documents/d1/access')).toHaveLength(1))
    await waitFor(() => expect(opened).toHaveLength(1))
    expect(String(opened[0][0])).toMatch(/\/admin\/documents\/download\/token-d1$/)
    // The new tab must not share the opener: the link is its only credential.
    expect(opened[0][1]).toBe('_blank')
    expect(opened[0][2]).toBe('noopener,noreferrer')
  })

  it('approves a document in one step', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Norte')
    await userEvent.click(await detail.findByRole('button', { name: `${t.applications.documents.approve} RUT` }))
    await waitFor(() => expect(to('PATCH', '/admin/applications/a1/documents/d1')).toHaveLength(1))
    expect(to('PATCH', '/admin/applications/a1/documents/d1')[0].body).toEqual({ status: 'ok' })
    expect(await screen.findByText(t.applications.documents.messages.ok)).toBeInTheDocument()
  })

  it('needs a comment to mark a document as not compliant, and sends it', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Norte')
    await userEvent.click(await detail.findByRole('button', { name: `${t.applications.documents.notCompliant} RUT` }))
    const dialog = within(await screen.findByRole('dialog', { name: t.applications.documents.verdictTitle.not_compliant }))
    await userEvent.click(dialog.getByRole('button', { name: t.applications.documents.confirmVerdict }))
    expect(await dialog.findByText(t.applications.documents.commentRequired)).toBeInTheDocument()
    expect(to('PATCH', '/admin/applications/a1/documents/d1')).toHaveLength(0)

    await userEvent.type(dialog.getByLabelText(t.applications.documents.commentLabel), ' Está borroso ')
    await userEvent.click(dialog.getByRole('button', { name: t.applications.documents.confirmVerdict }))
    await waitFor(() => expect(to('PATCH', '/admin/applications/a1/documents/d1')).toHaveLength(1))
    expect(to('PATCH', '/admin/applications/a1/documents/d1')[0].body).toEqual({ status: 'not_compliant', comment: 'Está borroso' })
    expect(await screen.findByText(t.applications.documents.messages.not_compliant)).toBeInTheDocument()
  })

  it('does not offer verdicts once the application is closed', async () => {
    serve()
    renderAt('/solicitudes')
    await userEvent.click(await screen.findByRole('combobox', { name: t.applications.statusLabel }))
    await userEvent.click(await screen.findByRole('option', { name: t.applications.status.approved }))
    const detail = await openDetail('ECA Vieja')
    await detail.findByRole('region', { name: t.applications.documents.title })
    expect(detail.queryByRole('button', { name: new RegExp(`^${t.applications.documents.approve}`) })).not.toBeInTheDocument()
  })

  it('explains a refusal', async () => {
    serve()
    failure = { status: 409, code: 'application_not_reviewable' }
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Norte')
    await userEvent.click(await detail.findByRole('button', { name: `${t.applications.documents.approve} RUT` }))
    expect(await screen.findByText(t.apiErrors.application_not_reviewable)).toBeInTheDocument()
  })

  it('shows the documents that were sent back in an earlier review', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Reenviada')
    expect(await detail.findByText('RUT: No cumple · Está ilegible')).toBeInTheDocument()
  })

  it('blocks approving while a required document is not approved, and says which', async () => {
    serve()
    renderAt('/solicitudes')
    const decision = await openDecision(await openDetail('ECA Norte'))
    expect(decision.getByText('No se puede aprobar todavía: faltan por aprobar RUT, Cédula del representante.')).toBeInTheDocument()
    expect(decision.getByRole('button', { name: t.applications.decision.confirm.approve })).toBeDisabled()
    // Asking for changes is still possible.
    await choose(decision, t.applications.decision.options.request_changes)
    expect(decision.getByRole('button', { name: t.applications.decision.confirm.request_changes })).toBeEnabled()
  })
})

describe('accessibility', () => {
  it('the queue', async () => {
    serve()
    renderAt('/solicitudes')
    await screen.findByText('ECA Norte')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('the detail', async () => {
    serve()
    renderAt('/solicitudes')
    const detail = await openDetail('ECA Reenviada')
    await detail.findByText('Rosa Representante')
    await expectNoA11yViolations()
  })

  it('the decision dialog', async () => {
    serve()
    renderAt('/solicitudes')
    await openDecision(await openDetail('ECA Norte'))
    await expectNoA11yViolations()
  })
})
