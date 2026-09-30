/**
 * A day range typed in two `<input type="date">` boxes ("YYYY-MM-DD", the operator's own calendar days)
 * as the instants the API expects: from the first millisecond of the first day to the last of the last.
 * Built in local time, so "today" means the operator's today and not UTC's.
 */
export function periodBounds(from: string, to: string): { date_from?: string; date_to?: string } {
  return {
    date_from: from ? new Date(`${from}T00:00:00.000`).toISOString() : undefined,
    date_to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  }
}

/** True when both days are set and the range runs backwards (it would match nothing). */
export function isBackwards(from: string, to: string): boolean {
  return Boolean(from && to && from > to)
}
