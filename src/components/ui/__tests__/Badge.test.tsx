import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge, type BadgeColor } from '../Badge'

describe('Badge', () => {
  it('renders with label correctly', () => {
    render(<Badge label="Verificado" />)
    expect(screen.getByText('Verificado')).toBeInTheDocument()
  })

  const colors: BadgeColor[] = ['success', 'warning', 'error', 'default', 'info', 'primary']

  colors.forEach((color) => {
    it(`renders without errors for color="${color}"`, () => {
      render(<Badge label="Test" color={color} />)
      expect(screen.getByText('Test')).toBeInTheDocument()
    })
  })

  it('renders with size="small" without errors', () => {
    render(<Badge label="Pequeño" size="small" />)
    expect(screen.getByText('Pequeño')).toBeInTheDocument()
  })
})
