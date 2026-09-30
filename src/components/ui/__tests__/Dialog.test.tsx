import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Dialog, DialogTitle, DialogContent } from '../Dialog'
import { t } from '../../../lib/i18n'

describe('Dialog', () => {
  it('renders content when open is true', () => {
    render(
      <Dialog open onClose={vi.fn()}>
        <DialogContent>Contenido del modal</DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Contenido del modal')).toBeInTheDocument()
  })

  it('does not render content when open is false', () => {
    render(
      <Dialog open={false} onClose={vi.fn()}>
        <DialogContent>Contenido oculto</DialogContent>
      </Dialog>
    )
    expect(screen.queryByText('Contenido oculto')).not.toBeInTheDocument()
  })

  it('shows close button when showClose is true', () => {
    render(
      <Dialog open onClose={vi.fn()}>
        <DialogTitle showClose onClose={vi.fn()}>Título</DialogTitle>
      </Dialog>
    )
    expect(screen.getByLabelText('Cerrar')).toBeInTheDocument()
    // The label is read from the dictionary, so it stays translatable in one place.
    expect(screen.getByLabelText(t.common.close)).toBe(screen.getByLabelText('Cerrar'))
  })

  it('does not show close button when showClose is not passed', () => {
    render(
      <Dialog open onClose={vi.fn()}>
        <DialogTitle>Título</DialogTitle>
      </Dialog>
    )
    expect(screen.queryByLabelText('Cerrar')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose}>
        <DialogTitle showClose onClose={onClose}>Título</DialogTitle>
      </Dialog>
    )
    await userEvent.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
