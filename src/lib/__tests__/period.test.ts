import { describe, expect, it } from 'vitest'
import { isBackwards, periodBounds } from '../period'

describe('periodBounds', () => {
  it('runs from the start of the first day to the end of the last, in the local calendar', () => {
    const { date_from, date_to } = periodBounds('2026-03-01', '2026-03-31')
    expect(date_from).toBe(new Date(2026, 2, 1, 0, 0, 0, 0).toISOString())
    expect(date_to).toBe(new Date(2026, 2, 31, 23, 59, 59, 999).toISOString())
  })

  it('leaves an empty side unbounded', () => {
    expect(periodBounds('', '')).toEqual({ date_from: undefined, date_to: undefined })
    expect(periodBounds('2026-03-01', '').date_to).toBeUndefined()
    expect(periodBounds('', '2026-03-31').date_from).toBeUndefined()
  })

  it('includes the whole last day when both sides are the same day', () => {
    const { date_from, date_to } = periodBounds('2026-03-05', '2026-03-05')
    expect(new Date(date_to!).getTime() - new Date(date_from!).getTime()).toBe(24 * 60 * 60 * 1000 - 1)
  })
})

describe('isBackwards', () => {
  it('is true only when both days are set and the range runs backwards', () => {
    expect(isBackwards('2026-03-10', '2026-03-01')).toBe(true)
    expect(isBackwards('2026-03-01', '2026-03-10')).toBe(false)
    expect(isBackwards('2026-03-01', '2026-03-01')).toBe(false)
    expect(isBackwards('', '2026-03-01')).toBe(false)
    expect(isBackwards('2026-03-10', '')).toBe(false)
  })
})
