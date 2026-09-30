import { afterEach, describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { mockAdapter } from '../../test/helpers'
import { catalogQueries } from '../catalogs'
import { weighingsQueries } from '../weighings'
import { recyclersQueries } from '../recyclers'
import { linksQueries } from '../links'
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
      weighingsQueries.list({ status: 'pending', materialCode: 'PET', affiliation: '', search: '', page: 2, rowsPerPage: 10 }),
    )
    expect(calls[0].params).toMatchObject({ status: 'pending', material_code: 'PET', limit: 10, offset: 20 })
  })

  it('omit empty filters instead of sending them', async () => {
    const calls = record()
    await new QueryClient().fetchQuery(weighingsQueries.list({ status: '', materialCode: '', affiliation: '', search: '', page: 0, rowsPerPage: 10 }))
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

describe('links queries', () => {
  it('turn the page and the state filter into limit/offset and status, and leave "every state" out', async () => {
    const calls = record()
    const client = new QueryClient()
    await client.fetchQuery(linksQueries.list({ status: 'requested', page: 1, rowsPerPage: 10 }))
    await client.fetchQuery(linksQueries.list({ status: '', page: 0, rowsPerPage: 10 }))
    expect(calls[0].params).toEqual({ status: 'requested', limit: 10, offset: 10 })
    expect(calls[1].params.status).toBeUndefined()
  })

  it('search the directory by name, but not with text the server would ignore', async () => {
    const calls = record()
    const client = new QueryClient()
    await client.fetchQuery(linksQueries.directory({ search: ' uno ', page: 0, rowsPerPage: 10 }))
    await client.fetchQuery(linksQueries.directory({ search: 'u', page: 0, rowsPerPage: 10 }))
    expect(calls[0].params).toMatchObject({ q: 'uno', limit: 10, offset: 0 })
    expect(calls[1].params.q).toBeUndefined()
  })
})


describe('weighings affiliation filter', () => {
  it('is sent when set and left out when empty', async () => {
    const calls = record()
    const client = new QueryClient()
    await client.fetchQuery(weighingsQueries.list({ status: '', materialCode: '', affiliation: 'unlinked_association', search: '', page: 0, rowsPerPage: 10 }))
    await client.fetchQuery(weighingsQueries.list({ status: '', materialCode: '', affiliation: '', search: '', page: 0, rowsPerPage: 10 }))
    expect(calls[0].params.affiliation).toBe('unlinked_association')
    expect(calls[1].params.affiliation).toBeUndefined()
  })
})

describe('weighings text search', () => {
  it('is sent trimmed, and not at all when shorter than the server accepts', async () => {
    const calls = record()
    const client = new QueryClient()
    await client.fetchQuery(weighingsQueries.list({ status: '', materialCode: '', affiliation: '', search: ' Wilson ', page: 0, rowsPerPage: 10 }))
    await client.fetchQuery(weighingsQueries.list({ status: '', materialCode: '', affiliation: '', search: 'W', page: 0, rowsPerPage: 10 }))
    expect(calls[0].params.q).toBe('Wilson')
    expect(calls[1].params.q).toBeUndefined()
  })
})
