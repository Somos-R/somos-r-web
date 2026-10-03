import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Checkbox } from '../Checkbox'

describe('Checkbox', () => {
  it('is found by its label and reflects the checked state', () => {
    const { rerender } = render(<Checkbox label="Acepto" checked={false} onChange={() => {}} />)
    expect(screen.getByLabelText('Acepto')).not.toBeChecked()
    rerender(<Checkbox label="Acepto" checked onChange={() => {}} />)
    expect(screen.getByLabelText('Acepto')).toBeChecked()
  })

  it('reports the new state when the box or its label is clicked', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Acepto" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByText('Acepto'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('shows the helper text, e.g. the validation error', () => {
    render(<Checkbox label="Acepto" checked={false} onChange={() => {}} error helperText="Debes aceptar" />)
    expect(screen.getByText('Debes aceptar')).toBeInTheDocument()
  })

  it('is disabled when asked to be', () => {
    render(<Checkbox label="Acepto" checked={false} onChange={() => {}} disabled />)
    expect(screen.getByLabelText('Acepto')).toBeDisabled()
  })
})
