import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card, CardContent, CardHeader } from '../Card'

describe('Card', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <CardContent>Contenido</CardContent>
      </Card>
    )
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })

  it('CardHeader shows title correctly', () => {
    render(<CardHeader title="Métricas" />)
    expect(screen.getByText('Métricas')).toBeInTheDocument()
  })

  it('CardHeader shows subtitle when provided', () => {
    render(<CardHeader title="Métricas" subtitle="Resumen del mes" />)
    expect(screen.getByText('Resumen del mes')).toBeInTheDocument()
  })

  it('CardHeader renders action when provided', () => {
    render(<CardHeader title="Métricas" action={<button>Exportar</button>} />)
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument()
  })
})
