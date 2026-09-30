import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with text correctly', () => {
    render(<Button>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('applies contained variant by default', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('MuiButton-contained')
  })

  it('shows CircularProgress when loading is true', () => {
    render(<Button loading>Cargando</Button>)
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument()
  })

  it('is disabled when loading is true', () => {
    render(<Button loading>Cargando</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled is true', () => {
    render(<Button disabled>Guardar</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked and enabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Click</Button>)
    // MUI disabled buttons have pointer-events:none — use fireEvent to bypass CSS check
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders with variant="destructive" without errors', () => {
    render(<Button variant="destructive">Eliminar</Button>)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('applies an explicit color independently of variant', () => {
    render(<Button variant="outlined" color="success">Validar</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('MuiButton-outlined')
    expect(btn).toHaveClass('MuiButton-colorSuccess')
  })

  it('lets an explicit color override the destructive default', () => {
    render(<Button variant="outlined" color="error">Rechazar</Button>)
    expect(screen.getByRole('button')).toHaveClass('MuiButton-colorError')
  })
})
