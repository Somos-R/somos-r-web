/**
 * How long each kind of data counts as fresh (no refetch on mount / window focus while fresh).
 * The app-wide default (30 s, lib/queryClient) suits lists and stats, which other people change.
 * These are for data that barely changes.
 */
export const STALE_TIME = {
  /** Materials and warehouses: edited rarely, by an admin. */
  catalog: 10 * 60_000,
  /** Document types (CC, CE...): never change while the app runs. */
  immutable: Infinity,
} as const
