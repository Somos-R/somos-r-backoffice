import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'

describe('App', () => {
  it('shows the placeholder page with one h1 inside main', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: t.app.title })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    await expectNoA11yViolations(document.body, { fullPage: true })
  })
})
