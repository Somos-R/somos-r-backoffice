import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FormDrawer, type FormFieldDef } from '../FormDrawer'

const TEXT_FIELDS: FormFieldDef[] = [
  { name: 'full_name', label: 'Full name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
]

const ALL_FIELD_TYPES: FormFieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'password', label: 'Password', type: 'password', required: true },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
  },
  { name: 'phone', label: 'Phone', type: 'tel' },
]

describe('FormDrawer', () => {
  it('renders with the provided title', () => {
    render(
      <FormDrawer open title="Create record" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByText('Create record')).toBeInTheDocument()
  })

  it('does not render content when open is false', () => {
    render(
      <FormDrawer open={false} title="Hidden" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('renders a text field', () => {
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument()
  })

  it('renders a select field', () => {
    const selectField: FormFieldDef[] = [
      { name: 'type', label: 'Type', type: 'select', options: [{ value: 'a', label: 'Option A' }] },
    ]
    render(
      <FormDrawer open title="Form" fields={selectField} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
  })

  it('renders a password field with visibility toggle', () => {
    const pwField: FormFieldDef[] = [{ name: 'password', label: 'Password', type: 'password' }]
    render(
      <FormDrawer open title="Form" fields={pwField} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Mostrar/ocultar contraseña')).toBeInTheDocument()
  })

  it('toggles password visibility when eye icon is clicked', async () => {
    const pwField: FormFieldDef[] = [{ name: 'password', label: 'Password', type: 'password' }]
    render(
      <FormDrawer open title="Form" fields={pwField} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByLabelText('Mostrar/ocultar contraseña'))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('disables submit button when required fields are empty', () => {
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('enables submit button only when all required fields are filled', async () => {
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Full name/), 'John')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
    expect(screen.getByRole('button', { name: 'Guardar' })).not.toBeDisabled()
  })

  it('calls onSubmit with correct values when all required fields are filled', async () => {
    const onSubmit = vi.fn()
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={onSubmit} />
    )
    await userEvent.type(screen.getByLabelText(/Full name/), 'John Doe')
    await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalledWith({ full_name: 'John Doe', email: 'john@example.com' })
  })

  it('runs the custom validate function and shows the returned error', async () => {
    const fields: FormFieldDef[] = [
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        validate: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email format' : undefined),
      },
    ]
    render(
      <FormDrawer open title="Form" fields={fields} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    await userEvent.type(screen.getByLabelText(/Email/), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText('Invalid email format')).toBeInTheDocument()
  })

  it('clears field error when the user starts typing', async () => {
    const fields: FormFieldDef[] = [
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        validate: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email format' : undefined),
      },
    ]
    render(
      <FormDrawer open title="Form" fields={fields} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    await userEvent.type(screen.getByLabelText(/Email/), 'bad')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Email/), 'x')
    expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument()
  })

  it('calls onClose when Cancel button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={onClose} onSubmit={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close icon button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={onClose} onSubmit={vi.fn()} />
    )
    await userEvent.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables close button and Cancel when isSubmitting is true', () => {
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={vi.fn()} isSubmitting />
    )
    expect(screen.getByLabelText('Cerrar')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })

  it('renders with a custom submitLabel', () => {
    render(
      <FormDrawer open title="Form" fields={TEXT_FIELDS} onClose={vi.fn()} onSubmit={vi.fn()} submitLabel="Registrar" />
    )
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument()
  })

  it('renders all field types without errors', () => {
    render(
      <FormDrawer open title="All types" fields={ALL_FIELD_TYPES} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Type/)).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
  })
})
