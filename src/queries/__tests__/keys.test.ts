import { describe, expect, it } from 'vitest'
import { queryKeys } from '../keys'
import { AFFECTED } from '../invalidation'

const page = { page: 0, rowsPerPage: 10 }

describe('queryKeys', () => {
  const samples = [
    queryKeys.me,
    queryKeys.catalogs.materials,
    queryKeys.catalogs.warehouses,
    queryKeys.catalogs.documentTypes,
    queryKeys.weighings.list({ status: '', materialCode: '', affiliation: '', search: '', ...page }),
    queryKeys.weighings.list({ status: '', materialCode: '', affiliation: 'independent', search: '', ...page }),
    queryKeys.weighings.stats,
    queryKeys.weighings.recent,
    queryKeys.inventory.list({ status: '', materialCode: '', warehouseId: '', ...page }),
    queryKeys.inventory.stats,
    queryKeys.inventory.priceSuggestion('PET', 'w1'),
    queryKeys.transactions.list('purchase', page),
    queryKeys.transactions.list('sale', page),
    queryKeys.transactions.pendingCount('purchase'),
    queryKeys.transactions.pendingCount('sale'),
    queryKeys.transactions.stats,
    queryKeys.recyclers.list({ status: 'all', search: '', ...page }),
    queryKeys.recyclers.list({ status: 'all', search: 'ana', ...page }),
    queryKeys.catalogs.roles,
    queryKeys.staff.list({ userType: 'eca', search: '', ...page }),
    queryKeys.staff.list({ userType: 'association', search: '', ...page }),
    queryKeys.links.list({ status: '', page: 0, rowsPerPage: 25 }),
    queryKeys.links.list({ status: 'requested', page: 0, rowsPerPage: 25 }),
    queryKeys.links.directory({ search: '', page: 0, rowsPerPage: 10 }),
    queryKeys.links.directory({ search: 'uno', page: 0, rowsPerPage: 10 }),
    queryKeys.recyclers.count('verified'),
    queryKeys.recyclers.count('pending'),
  ]

  it('never repeats a key for different data', () => {
    const serialized = samples.map((k) => JSON.stringify(k))
    expect(new Set(serialized).size).toBe(serialized.length)
  })

  it('keeps every key under its resource root, so invalidating the root reaches it', () => {
    const roots: Record<string, readonly string[]> = {
      weighings: queryKeys.weighings.all,
      inventory: queryKeys.inventory.all,
      transactions: queryKeys.transactions.all,
      recyclers: queryKeys.recyclers.all,
      catalogs: queryKeys.catalogs.all,
      staff: queryKeys.staff.all,
      links: queryKeys.links.all,
      me: queryKeys.me,
    }
    for (const key of samples) {
      expect(roots[key[0] as string]).toEqual([key[0]])
    }
  })

  it('keeps catalogs out of the inventory root', () => {
    for (const key of [queryKeys.catalogs.materials, queryKeys.catalogs.warehouses, queryKeys.catalogs.documentTypes]) {
      expect(key[0]).toBe('catalogs')
    }
  })

  it('separates lists by every input they depend on', () => {
    const a = queryKeys.weighings.list({ status: 'pending', materialCode: '', affiliation: '', search: '', ...page })
    const b = queryKeys.weighings.list({ status: 'paid', materialCode: '', affiliation: '', search: '', ...page })
    const c = queryKeys.weighings.list({ status: 'pending', materialCode: '', affiliation: '', search: '', page: 1, rowsPerPage: 10 })
    expect(new Set([a, b, c].map((k) => JSON.stringify(k))).size).toBe(3)
  })
})

describe('AFFECTED', () => {
  it('never invalidates catalogs', () => {
    for (const keys of Object.values(AFFECTED)) {
      expect(keys.some((k) => (k[0] as string) === 'catalogs')).toBe(false)
    }
  })

  it('reviewing a weighing reaches inventory and transactions; registering one does not', () => {
    const roots = (keys: readonly (readonly unknown[])[]) => keys.map((k) => k[0])
    expect(roots(AFFECTED.weighingReviewed)).toEqual(['weighings', 'inventory', 'transactions'])
    expect(roots(AFFECTED.weighingRegistered)).toEqual(['weighings'])
  })
})
