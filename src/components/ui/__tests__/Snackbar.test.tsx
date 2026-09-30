import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Snackbar } from '../Snackbar'

describe('Snackbar', () => {
  it('is visible when open is true', () => {
    render(<Snackbar open onClose={vi.fn()} message="Operación exitosa" />)
    expect(screen.getByText('Operación exitosa')).toBeInTheDocument()
  })

  it('is not visible when open is false', () => {
    render(<Snackbar open={false} onClose={vi.fn()} message="Mensaje oculto" />)
    expect(screen.queryByText('Mensaje oculto')).not.toBeInTheDocument()
  })

  it('shows message correctly', () => {
    render(<Snackbar open onClose={vi.fn()} message="Sesión cerrada" />)
    expect(screen.getByText('Sesión cerrada')).toBeInTheDocument()
  })

  it('calls onClose after duration ms', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<Snackbar open onClose={onClose} message="Éxito" duration={1000} />)
    vi.advanceTimersByTime(1000)
    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
