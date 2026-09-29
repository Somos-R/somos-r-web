import { afterEach, describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { mockAdapter } from '../../test/helpers'
import { catalogQueries } from '../catalogs'
import { weighingsQueries } from '../weighings'
import { recyclersQueries } from '../recyclers'
import { STALE_TIME } from '../config'

const original = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = original
})

function record() {
  const calls: { url?: string; params: Record<string, unknown> }[] = []
  apiClient.defaults.adapter = mockAdapter((config) => {
    calls.push({ url: config.url, params: config.params ?? {} })
    return { data: { items: [], total: 0 } }
  })
  return calls
}

describe('query options', () => {
  it('give every catalog a long staleTime, wherever it is used', () => {
    expect(catalogQueries.materials().staleTime).toBe(STALE_TIME.catalog)
    expect(catalogQueries.warehouses().staleTime).toBe(STALE_TIME.catalog)
    expect(catalogQueries.documentTypes().staleTime).toBe(STALE_TIME.immutable)
  })

  it('turn the page and filters of a weighings list into limit/offset', async () => {
    const calls = record()
    await new QueryClient().fetchQuery(
      weighingsQueries.list({ status: 'pending', materialCode: 'PET', page: 2, rowsPerPage: 10 }),
    )
    expect(calls[0].params).toMatchObject({ status: 'pending', material_code: 'PET', limit: 10, offset: 20 })
  })

  it('omit empty filters instead of sending them', async () => {
    const calls = record()
    await new QueryClient().fetchQuery(weighingsQueries.list({ status: '', materialCode: '', page: 0, rowsPerPage: 10 }))
    expect(calls[0].params.status).toBeUndefined()
    expect(calls[0].params.material_code).toBeUndefined()
  })

  it('count verified and pending recyclers with a single-row request', async () => {
    const calls = record()
    const client = new QueryClient()
    await client.fetchQuery(recyclersQueries.count('verified'))
    await client.fetchQuery(recyclersQueries.count('pending'))
    expect(calls.map((c) => c.params.verification_status)).toEqual(['verified', 'pending'])
    expect(calls.every((c) => c.params.limit === 1)).toBe(true)
  })
})
