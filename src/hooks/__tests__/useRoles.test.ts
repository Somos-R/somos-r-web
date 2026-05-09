import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from 'react'

vi.mock('../useAuth', () => {
  let mockUser: { role: string } | null = null
  return {
    useAuthStore: () => ({ user: mockUser }),
    __setMockUser: (user: { role: string } | null) => { mockUser = user },
  }
})

import { useRoles } from '../useRoles'

const setMockUser = async (user: { role: string } | null) => {
  const mod = await import('../useAuth') as unknown as { __setMockUser: (u: typeof user) => void }
  act(() => { mod.__setMockUser(user) })
}

describe('useRoles', () => {
  beforeEach(async () => {
    await setMockUser(null)
  })

  it('returns false for all permissions when no user is authenticated', () => {
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeePesajes).toBe(false)
    expect(result.current.canSeeRecicladores).toBe(false)
    expect(result.current.canSeeDashboard).toBe(false)
    expect(result.current.canSeeReportes).toBe(false)
  })

  it('canSeePesajes is true for operador_eca', async () => {
    await setMockUser({ role: 'operador_eca' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeePesajes).toBe(true)
  })

  it('canSeePesajes is true for admin_eca', async () => {
    await setMockUser({ role: 'admin_eca' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeePesajes).toBe(true)
  })

  it('canSeeRecicladores is true for admin_asociacion', async () => {
    await setMockUser({ role: 'admin_asociacion' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeRecicladores).toBe(true)
  })

  it('all permissions are true for superadmin', async () => {
    await setMockUser({ role: 'superadmin' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeePesajes).toBe(true)
    expect(result.current.canSeeRecicladores).toBe(true)
    expect(result.current.canSeeDashboard).toBe(true)
    expect(result.current.canSeeReportes).toBe(true)
  })

  it('canSeeRecicladores is false for operador_eca', async () => {
    await setMockUser({ role: 'operador_eca' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeRecicladores).toBe(false)
  })

  it('canSeePesajes is false for admin_asociacion', async () => {
    await setMockUser({ role: 'admin_asociacion' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeePesajes).toBe(false)
  })
})
