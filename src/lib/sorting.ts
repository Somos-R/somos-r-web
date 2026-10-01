export type SortOrder = 'asc' | 'desc'

/** The column a server-ordered table is sorted by, and which way. */
export interface SortState<Column extends string> {
  column: Column
  direction: SortOrder
}

/**
 * What clicking a column header does: the ordered column flips direction; any other column starts in its
 * natural direction (`newestFirst` — the date — begins descending, everything else ascending).
 */
export function nextSort<Column extends string>(
  current: SortState<Column>,
  column: Column,
  newestFirst: Column,
): SortState<Column> {
  if (current.column === column) return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  return { column, direction: column === newestFirst ? 'desc' : 'asc' }
}
