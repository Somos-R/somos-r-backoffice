import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Select } from '../Select'

const OPTIONS = [
  { value: 'paper', label: 'Papel' },
  { value: 'plastic', label: 'Plástico' },
  { value: 'metal', label: 'Metal' },
]

describe('Select', () => {
  it('renders with label correctly', () => {
    render(<Select label="Material" options={OPTIONS} />)
    expect(screen.getByLabelText('Material')).toBeInTheDocument()
  })

  it('shows all options when opened', async () => {
    render(<Select label="Material" options={OPTIONS} value="" />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('option', { name: 'Papel' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Plástico' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Metal' })).toBeInTheDocument()
  })

  it('calls onChange when selecting an option', async () => {
    const onChange = vi.fn()
    render(<Select label="Material" options={OPTIONS} value="" onChange={onChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Papel' }))
    expect(onChange).toHaveBeenCalled()
  })

  it('shows helperText when provided', () => {
    render(<Select label="Material" options={OPTIONS} helperText="Selecciona un material" />)
    expect(screen.getByText('Selecciona un material')).toBeInTheDocument()
  })

  it('is disabled when disabled is true', () => {
    render(<Select label="Material" options={OPTIONS} disabled />)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders required variant without errors', () => {
    render(<Select label="Material" options={OPTIONS} required />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
