import { describe, it, expect, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../../lib/apiClient'
import { inventoryService } from '../inventory'
import { transactionsService } from '../transactions'
import { weighingsService } from '../weighings'
import { mockAdapter } from '../../test/helpers'

// The API contract is English (status, price_per_kg, occurred_at, pending_validation, purchase...).
// These tests pin what the web sends, so a stray Spanish name fails here instead of as a
// 422 (or a silently empty list) against the real backend.

let seen: InternalAxiosRequestConfig[]

const bodyOf = (config: InternalAxiosRequestConfig) => JSON.parse(String(config.data))

describe('API contract (English names and values)', () => {
  beforeEach(() => {
    seen = []
    apiClient.defaults.adapter = mockAdapter((config) => {
      seen.push(config)
      return { data: { total: 0, items: [] } }
    })
  })

  describe('weighings', () => {
    it('filters by ?status= with the new status codes', async () => {
      await weighingsService.list({ status: 'pending_validation' })
      expect(seen[0].params).toMatchObject({ status: 'pending_validation' })
      expect(seen[0].params).not.toHaveProperty('estado')
    })

    it.each(['validated', 'rejected', 'paid'] as const)('sends status "%s" when transitioning', async (status) => {
      await weighingsService.updateStatus('w1', { status })
      expect(bodyOf(seen[0])).toEqual({ status })
    })

    it('keeps the rejection reason when rejecting', async () => {
      await weighingsService.updateStatus('w1', { status: 'rejected', rejection_reason: 'Material mojado' })
      expect(bodyOf(seen[0])).toEqual({ status: 'rejected', rejection_reason: 'Material mojado' })
    })

    it('creates a weighing with price_per_kg', async () => {
      await weighingsService.create({
        recycler_id: 'r1', material_code: 'plastic', warehouse_id: 'b1', kg: 12, price_per_kg: 450,
      })
      const body = bodyOf(seen[0])
      expect(body).toMatchObject({ material_code: 'plastic', price_per_kg: 450 })
      expect(body).not.toHaveProperty('precio_kg')
    })
  })

  describe('transactions', () => {
    it('filters by the new type and status values', async () => {
      await transactionsService.list({ type: 'purchase', status: 'pending' })
      expect(seen[0].params).toMatchObject({ type: 'purchase', status: 'pending' })
    })

    it.each(['paid', 'cancelled', 'delivered'] as const)('sends status "%s" when updating', async (status) => {
      await transactionsService.updateStatus('t1', status)
      expect(bodyOf(seen[0])).toEqual({ status })
    })

    it('creates a sale with price_per_kg', async () => {
      await transactionsService.createSale({ material_code: 'glass', warehouse_id: 'b1', kg: 5, price_per_kg: 300 })
      expect(seen[0].url).toBe('/transactions')
      const body = bodyOf(seen[0])
      expect(body).toMatchObject({ material_code: 'glass', price_per_kg: 300 })
      expect(body).not.toHaveProperty('precio_kg')
    })
  })

  describe('inventory', () => {
    it('updates the reference price as price_per_kg', async () => {
      await inventoryService.update('i1', { stock_min_kg: 50, price_per_kg: 700 })
      const body = bodyOf(seen[0])
      expect(body).toEqual({ stock_min_kg: 50, price_per_kg: 700 })
    })
  })
})
