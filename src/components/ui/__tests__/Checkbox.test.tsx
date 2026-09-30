import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '../Checkbox'
import { expectNoA11yViolations } from '../../../test/axe'

describe('Checkbox', () => {
  it('is named by its label and reflects the checked state', () => {
    render(<Checkbox label="I saved them" checked onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'I saved them' })).toBeChecked()
  })

  it('reports the new value when toggled', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="I saved them" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'I saved them' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('is disabled when asked', () => {
    render(<Checkbox label="I saved them" checked={false} onChange={() => {}} disabled />)
    expect(screen.getByRole('checkbox', { name: 'I saved them' })).toBeDisabled()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Checkbox label="I saved them" checked={false} onChange={() => {}} />)
    await expectNoA11yViolations(container)
  })
})
