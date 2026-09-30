import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { RequirePermission } from '../RequirePermission'
import { t } from '../../../lib/i18n'
import type { Permission } from '../../../lib/permissions'

let mockUser: { capabilities: string[] } | null = null
vi.mock('../../../hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }))

const Where = () => <div data-testid="where">{useLocation().pathname}</div>

function renderGuard(permission: Permission, redirectIfDenied = false) {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Where />
      <Routes>
        <Route
          path="/secret"
          element={
            <RequirePermission permission={permission} redirectIfDenied={redirectIfDenied}>
              <div>secret page</div>
            </RequirePermission>
          }
        />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequirePermission', () => {
  beforeEach(() => {
    mockUser = null
  })

  it('renders the page when the server announced the capability', () => {
    mockUser = { capabilities: ['users.manage'] }
    renderGuard('users.manage')
    expect(screen.getByText('secret page')).toBeInTheDocument()
  })

  it('shows the 403 screen instead of the page when the capability is missing', () => {
    mockUser = { capabilities: ['audit.read'] }
    renderGuard('users.manage')
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
    expect(screen.getByText(t.forbidden.title)).toBeInTheDocument()
  })

  it('the 403 screen sends the account back to the home page', async () => {
    mockUser = { capabilities: [] }
    renderGuard('users.manage')
    await userEvent.click(screen.getByRole('button', { name: t.forbidden.back }))
    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('redirects instead of showing the 403 when asked', () => {
    mockUser = { capabilities: [] }
    renderGuard('users.manage', true)
    expect(screen.getByTestId('where')).toHaveTextContent('/')
    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('denies everything when nobody is signed in', () => {
    renderGuard('home.view')
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })
})
