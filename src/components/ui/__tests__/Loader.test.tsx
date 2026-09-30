import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Loader } from '../Loader'
import { t } from '../../../lib/i18n'

describe('Loader', () => {
  it('is a progress indicator with an accessible name', () => {
    render(<Loader />)
    expect(screen.getByRole('progressbar', { name: t.common.loading })).toBeInTheDocument()
  })

  it('accepts a more specific label', () => {
    render(<Loader label="Cargando pesajes…" />)
    expect(screen.getByRole('progressbar', { name: 'Cargando pesajes…' })).toBeInTheDocument()
  })

  it('forwards size and color to the spinner', () => {
    render(<Loader size={18} color="inherit" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveStyle({ width: '18px', height: '18px' })
    expect(bar.className).toMatch(/colorInherit/)
  })
})
