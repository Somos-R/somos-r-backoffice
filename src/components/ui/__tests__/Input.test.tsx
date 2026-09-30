import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../Input'

describe('Input', () => {
  it('renders with label correctly', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows placeholder when no value', () => {
    render(<Input placeholder="admin@eca.com" />)
    expect(screen.getByPlaceholderText('admin@eca.com')).toBeInTheDocument()
  })

  it('calls onChange when typing', async () => {
    const onChange = vi.fn()
    render(<Input label="Email" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'test')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows helperText when provided', () => {
    render(<Input label="Email" helperText="El email es requerido" />)
    expect(screen.getByText('El email es requerido')).toBeInTheDocument()
  })

  it('applies error styles when error is true', () => {
    render(<Input label="Email" error helperText="Error" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(document.querySelector('.Mui-error')).toBeInTheDocument()
  })

  it('is disabled when disabled is true', () => {
    render(<Input label="Email" disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders startAdornment when provided', () => {
    render(<Input label="Email" startAdornment={<span>@</span>} />)
    expect(screen.getByText('@')).toBeInTheDocument()
  })

  it('renders endAdornment when provided', () => {
    render(<Input label="Password" endAdornment={<span>👁</span>} />)
    expect(screen.getByText('👁')).toBeInTheDocument()
  })

  it('marks the input as required when required is true', () => {
    render(<Input label="Email" required />)
    expect(screen.getByRole('textbox')).toBeRequired()
  })

  it('accepts a numeric value, for fields like kg or precio', () => {
    render(<Input label="Kilogramos" value={12.5} onChange={() => {}} />)
    expect(screen.getByLabelText('Kilogramos')).toHaveValue('12.5')
  })
})
