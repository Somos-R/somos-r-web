import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PeriodFilter from '../PeriodFilter'
import { t } from '../../../lib/i18n'

describe('PeriodFilter', () => {
  it('reports the day typed in each box', () => {
    const onFromChange = vi.fn()
    const onToChange = vi.fn()
    render(<PeriodFilter from="" to="" onFromChange={onFromChange} onToChange={onToChange} />)
    fireEvent.change(screen.getByLabelText(t.common.period.from), { target: { value: '2026-03-01' } })
    fireEvent.change(screen.getByLabelText(t.common.period.to), { target: { value: '2026-03-31' } })
    expect(onFromChange).toHaveBeenCalledWith('2026-03-01')
    expect(onToChange).toHaveBeenCalledWith('2026-03-31')
  })

  it('warns only when the period runs backwards', () => {
    const { rerender } = render(<PeriodFilter from="2026-03-10" to="2026-03-01" onFromChange={() => {}} onToChange={() => {}} />)
    expect(screen.getByText(t.common.period.backwards)).toBeInTheDocument()
    rerender(<PeriodFilter from="2026-03-01" to="2026-03-10" onFromChange={() => {}} onToChange={() => {}} />)
    expect(screen.queryByText(t.common.period.backwards)).not.toBeInTheDocument()
  })
})
