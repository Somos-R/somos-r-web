import { describe, expect, it } from 'vitest'
import { nextSort, type SortState } from '../sorting'

type Column = 'occurred_at' | 'kg'
const start: SortState<Column> = { column: 'occurred_at', direction: 'desc' }

describe('nextSort', () => {
  it('flips the direction of the column already ordered by', () => {
    expect(nextSort(start, 'occurred_at', 'occurred_at')).toEqual({ column: 'occurred_at', direction: 'asc' })
    expect(nextSort({ column: 'kg', direction: 'asc' }, 'kg', 'occurred_at')).toEqual({ column: 'kg', direction: 'desc' })
  })

  it('starts a new column ascending, except the date, which starts newest first', () => {
    expect(nextSort(start, 'kg', 'occurred_at')).toEqual({ column: 'kg', direction: 'asc' })
    expect(nextSort({ column: 'kg', direction: 'desc' }, 'occurred_at', 'occurred_at')).toEqual({ column: 'occurred_at', direction: 'desc' })
  })
})
