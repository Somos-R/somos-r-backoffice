import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../ErrorBoundary'
import { ErrorScreen } from '../ErrorScreen'
import { t } from '../../../lib/i18n'
import * as reporting from '../../../lib/reportError'

const SECRET = 'Cannot read properties of undefined (reading internalToken)'

let shouldCrash = true

function Bomb() {
  if (shouldCrash) throw new Error(SECRET)
  return <div>all good</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldCrash = true
    // React logs every caught render error; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders its children when nothing fails', () => {
    shouldCrash = false
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('shows an error screen instead of a blank page when a child throws', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(t.errorScreen.title)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.errorScreen.retry })).toBeInTheDocument()
  })

  it('reports the error once, with the component stack', () => {
    const report = vi.spyOn(reporting, 'reportError').mockImplementation(() => undefined)
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(report.mock.calls[0][1]).toHaveProperty('componentStack')
  })

  it('"Retry" renders the children again, and works once the cause is gone', async () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    shouldCrash = false
    await userEvent.click(screen.getByRole('button', { name: t.errorScreen.retry }))
    expect(screen.getByText('all good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the error if retrying crashes again, instead of looping or going blank', async () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    await userEvent.click(screen.getByRole('button', { name: t.errorScreen.retry }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clears the error when a reset key changes (e.g. the user navigates)', () => {
    const { rerender } = render(<ErrorBoundary resetKeys={['/a']}><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    shouldCrash = false
    rerender(<ErrorBoundary resetKeys={['/b']}><Bomb /></ErrorBoundary>)
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('keeps showing the error while the reset keys stay the same', () => {
    const { rerender } = render(<ErrorBoundary resetKeys={['/a']}><Bomb /></ErrorBoundary>)
    shouldCrash = false
    rerender(<ErrorBoundary resetKeys={['/a']}><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('accepts a custom fallback', () => {
    render(<ErrorBoundary fallback={({ reset }) => <button onClick={reset}>custom</button>}><Bomb /></ErrorBoundary>)
    expect(screen.getByRole('button', { name: 'custom' })).toBeInTheDocument()
  })
})

describe('ErrorScreen', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('shows the technical message only in development', () => {
    render(<ErrorScreen error={new Error(SECRET)} onRetry={() => undefined} />)
    expect(screen.getByText(SECRET)).toBeInTheDocument()
  })

  it('never shows the technical message to users in production', () => {
    vi.stubEnv('DEV', false)
    render(<ErrorScreen error={new Error(SECRET)} onRetry={() => undefined} />)
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument()
    expect(screen.getByText(t.errorScreen.message)).toBeInTheDocument()
  })

  it('offers a full reload only in the whole-page variant', () => {
    const { rerender } = render(<ErrorScreen error={new Error('x')} onRetry={() => undefined} />)
    expect(screen.queryByRole('button', { name: t.errorScreen.reload })).not.toBeInTheDocument()
    rerender(<ErrorScreen fullScreen error={new Error('x')} onRetry={() => undefined} />)
    expect(screen.getByRole('button', { name: t.errorScreen.reload })).toBeInTheDocument()
  })

  describe('when a page fails to download (stale deploy or dropped connection)', () => {
    const chunkError = () => new Error('Failed to fetch dynamically imported module: /assets/Inventory-abc.js')

    it('asks for a reload instead of offering a retry that cannot work', () => {
      render(<ErrorScreen error={chunkError()} onRetry={() => undefined} />)
      expect(screen.getByText(t.errorScreen.chunkMessage)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: t.errorScreen.reload })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: t.errorScreen.retry })).not.toBeInTheDocument()
    })

    it('reloads the page when asked', async () => {
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      render(<ErrorScreen error={chunkError()} onRetry={() => undefined} />)
      await userEvent.click(screen.getByRole('button', { name: t.errorScreen.reload }))
      expect(reload).toHaveBeenCalledTimes(1)
      vi.unstubAllGlobals()
    })

    it('does not show the reload-only message for ordinary render errors', () => {
      render(<ErrorScreen error={new Error('boom')} onRetry={() => undefined} />)
      expect(screen.queryByText(t.errorScreen.chunkMessage)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: t.errorScreen.retry })).toBeInTheDocument()
    })
  })
})
