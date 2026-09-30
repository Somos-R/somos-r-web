import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { AFFECTED, invalidateAffected } from '../invalidation'
import { queryKeys } from '../keys'

function seeded() {
  const client = new QueryClient()
  const keys = [
    queryKeys.weighings.stats,
    queryKeys.weighings.recent,
    queryKeys.inventory.stats,
    queryKeys.transactions.stats,
    queryKeys.recyclers.verified('ana'),
    queryKeys.catalogs.materials,
  ]
  keys.forEach((k) => client.setQueryData(k, 1))
  return client
}

const invalidated = (client: QueryClient, key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated

describe('link changes', () => {
  it('reload the links and the directory (which carries the link state), and nothing else', () => {
    const client = seeded()
    client.setQueryData(queryKeys.links.list({ status: '', page: 0, rowsPerPage: 25 }), 1)
    client.setQueryData(queryKeys.links.directory({ search: '', page: 0, rowsPerPage: 10 }), 1)
    invalidateAffected(client, AFFECTED.linkChanged)
    expect(invalidated(client, queryKeys.links.list({ status: '', page: 0, rowsPerPage: 25 }))).toBe(true)
    expect(invalidated(client, queryKeys.links.directory({ search: '', page: 0, rowsPerPage: 10 }))).toBe(true)
    expect(invalidated(client, queryKeys.weighings.stats)).toBe(false)
    expect(invalidated(client, queryKeys.catalogs.materials)).toBe(false)
  })
})

describe('invalidateAffected', () => {
  it('marks stale everything the action touches and nothing else', () => {
    const client = seeded()
    invalidateAffected(client, AFFECTED.weighingReviewed)
    expect(invalidated(client, queryKeys.weighings.stats)).toBe(true)
    expect(invalidated(client, queryKeys.weighings.recent)).toBe(true)
    expect(invalidated(client, queryKeys.inventory.stats)).toBe(true)
    expect(invalidated(client, queryKeys.transactions.stats)).toBe(true)
    expect(invalidated(client, queryKeys.recyclers.verified('ana'))).toBe(false)
    expect(invalidated(client, queryKeys.catalogs.materials)).toBe(false)
  })

  it('leaves inventory alone when a weighing is only registered', () => {
    const client = seeded()
    invalidateAffected(client, AFFECTED.weighingRegistered)
    expect(invalidated(client, queryKeys.weighings.stats)).toBe(true)
    expect(invalidated(client, queryKeys.inventory.stats)).toBe(false)
  })
})
