import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from './keys'

/**
 * What goes stale when something changes. One table for the whole app, used both after a successful
 * action (`invalidateAffected`) and when an action fails (`meta.refreshOnError`): if it failed, the
 * screen is probably showing outdated data of the same things.
 *
 * The reasoning lives here, not scattered across screens:
 * - Validating or paying a weighing creates the purchase and moves stock, so it reaches
 *   inventory and transactions too. Registering one only adds a pending row.
 * - A sale (or cancelling/delivering one) changes stock, and settled purchases relate to weighings.
 * - Catalogs never appear here: they don't change with any of these actions.
 */
export const AFFECTED = {
  /** A new pending weighing: no stock or transaction exists yet. */
  weighingRegistered: [queryKeys.weighings.all],
  /** Validated, rejected or paid. */
  weighingReviewed: [queryKeys.weighings.all, queryKeys.inventory.all, queryKeys.transactions.all],
  /** A sale was created, or a transaction was paid, delivered or cancelled. */
  transactionChanged: [queryKeys.transactions.all, queryKeys.inventory.all, queryKeys.weighings.all],
  /** Minimum stock or reference price edited. */
  inventoryEdited: [queryKeys.inventory.all],
  /** A recycler was registered, verified or rejected. */
  recyclerChanged: [queryKeys.recyclers.all],
} as const satisfies Record<string, readonly QueryKey[]>

export function invalidateAffected(client: QueryClient, keys: readonly QueryKey[]) {
  keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))
}
