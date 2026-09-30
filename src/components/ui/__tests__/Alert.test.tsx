import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Alert } from '../Alert'

describe('Alert', () => {
  it('renders children correctly', () => {
    render(<Alert severity="info">Mensaje de alerta</Alert>)
    expect(screen.getByText('Mensaje de alerta')).toBeInTheDocument()
  })

  const severities = ['success', 'error', 'warning', 'info'] as const

  severities.forEach((severity) => {
    it(`renders without errors for severity="${severity}"`, () => {
      render(<Alert severity={severity}>Texto</Alert>)
      expect(screen.getByText('Texto')).toBeInTheDocument()
    })
  })

  it('shows close button when onClose is provided', () => {
    render(<Alert severity="info" onClose={vi.fn()}>Texto</Alert>)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<Alert severity="info" onClose={onClose}>Texto</Alert>)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
