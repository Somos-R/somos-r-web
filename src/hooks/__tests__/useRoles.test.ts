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
    expect(result.current.canSeeWeighings).toBe(false)
    expect(result.current.canSeeRecyclers).toBe(false)
    expect(result.current.canSeeDashboard).toBe(false)
    expect(result.current.canSeeReports).toBe(false)
  })

  it('canSeeWeighings is true for operador_eca', async () => {
    await setMockUser({ role: 'operador_eca' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeWeighings).toBe(true)
  })

  it('canSeeWeighings is true for admin_eca', async () => {
    await setMockUser({ role: 'admin_eca' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeWeighings).toBe(true)
  })

  it('canSeeRecyclers is true for admin_asociacion', async () => {
    await setMockUser({ role: 'admin_asociacion' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeRecyclers).toBe(true)
  })

  it('all permissions are true for superadmin', async () => {
    await setMockUser({ role: 'superadmin' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeWeighings).toBe(true)
    expect(result.current.canSeeRecyclers).toBe(true)
    expect(result.current.canSeeDashboard).toBe(true)
    expect(result.current.canSeeReports).toBe(true)
  })

  it('canSeeRecyclers is true for operador_eca', async () => {
    await setMockUser({ role: 'operador_eca' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeRecyclers).toBe(true)
  })

  it('canSeeWeighings is false for admin_asociacion', async () => {
    await setMockUser({ role: 'admin_asociacion' })
    const { result } = renderHook(() => useRoles())
    expect(result.current.canSeeWeighings).toBe(false)
  })
})
