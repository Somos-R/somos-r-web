import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KpiValue } from '../KpiValue'

describe('KpiValue', () => {
  it('shows the value and its label', () => {
    render(<KpiValue value="42" label="Pesajes este mes" />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Pesajes este mes')).toBeInTheDocument()
  })

  it('renders the value as a paragraph, not a heading, in either size', () => {
    const { rerender } = render(<KpiValue value="42" label="x" size="large" />)
    expect(screen.getByText('42').tagName).toBe('P')
    expect(screen.getByText('42').className).toMatch(/MuiTypography-h4/)

    rerender(<KpiValue value="42" label="x" size="small" />)
    expect(screen.getByText('42').tagName).toBe('P')
    expect(screen.getByText('42').className).toMatch(/MuiTypography-h5/)
  })

  it('defaults to the large size', () => {
    render(<KpiValue value="42" label="x" />)
    expect(screen.getByText('42').className).toMatch(/MuiTypography-h4/)
  })
})
