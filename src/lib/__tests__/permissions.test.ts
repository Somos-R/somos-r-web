import { describe, it, expect } from 'vitest'
import { can, isStaffRole, type Permission, type StaffRole } from '../permissions'
import { mapToAuthUser } from '../../services/auth'
import { capabilitiesForRole } from '../../test/capabilities'

// Expected matrix, transcribed from the backend's docs/matriz-permisos.md (not derived from the
// implementation under test). Column order below.
const ROLES: StaffRole[] = [
  'association_admin', 'association_operator', 'route_manager',
  'eca_admin', 'eca_operator', 'eca_warehouse',
]

//                                   assoc  assoc  route  eca    eca    eca
//                                   admin  oper   mgr    admin  oper   wh
const MATRIX: Record<Exclude<Permission, 'settings.view'>, boolean[]> = {
  'recyclers.view':       [true,  true,  true,  true,  true,  true],
  'recyclers.register':   [true,  true,  true,  true,  true,  true],
  'recyclers.verify':     [true,  true,  false, false, false, false],
  'weighings.view':       [true,  true,  false, true,  true,  true],
  'weighings.create':     [false, false, false, true,  true,  false],
  'weighings.review':     [true,  true,  false, true,  true,  false],
  'weighings.pay':        [true,  false, false, true,  false, false],
  'inventory.view':       [true,  true,  false, true,  true,  true],
  'inventory.edit':       [false, false, false, true,  false, true],
  'transactions.view':    [true,  false, false, true,  true,  true],
  'transactions.create':  [false, false, false, true,  false, true],
  'transactions.manage':  [false, false, false, true,  false, true],
  'transactions.pay':     [true,  false, false, true,  false, false],
  // Only organization admins see and invite their organization's staff.
  'staff.view':          [true,  false, false, true,  false, false],
  'staff.invite':        [true,  false, false, true,  false, false],
  'staff.manage':        [true,  false, false, true,  false, false],
  // Links between an ECA and an Association: both admins see them, the ECA asks, the Association decides.
  'links.view':          [true,  false, false, true,  false, false],
  'links.request':       [false, false, false, true,  false, false],
  'links.decide':        [true,  false, false, false, false, false],
  // Pages built on weighing data follow weighings.view.
  'dashboard.view':       [true,  true,  false, true,  true,  true],
  'reports.view':         [true,  true,  false, true,  true,  true],
}

const staff = (role: StaffRole) => ({ role, capabilities: capabilitiesForRole(role) })
const noRole = { role: null, capabilities: [] }

describe('can() against the backend permission matrix', () => {
  const cases = Object.entries(MATRIX).flatMap(([permission, allowed]) =>
    ROLES.map((role, i) => [permission as Permission, role, allowed[i]] as const),
  )

  it.each(cases)('%s for %s → %s', (permission, role, expected) => {
    expect(can(staff(role), permission)).toBe(expected)
  })

  it('every signed-in user can open settings, including staff without a role', () => {
    ROLES.forEach((role) => expect(can(staff(role), 'settings.view')).toBe(true))
    expect(can(noRole, 'settings.view')).toBe(true)
    expect(can(noRole, 'settings.view')).toBe(true)
  })

  it('grants nothing to users without a role (recycler, citizen, roleless staff)', () => {
    for (const permission of Object.keys(MATRIX) as Permission[]) {
      expect(can(noRole, permission)).toBe(false)
    }
  })

  it('grants nothing when signed out', () => {
    expect(can(null, 'settings.view')).toBe(false)
    expect(can(undefined, 'weighings.view')).toBe(false)
  })
})

describe('isStaffRole', () => {
  it('accepts the six backend roles and rejects everything else', () => {
    ROLES.forEach((role) => expect(isStaffRole(role)).toBe(true))
    for (const value of ['superadmin', 'admin_eca', 'operador_eca', 'recycler', '', null, undefined, 42]) {
      expect(isStaffRole(value)).toBe(false)
    }
  })
})

describe('mapToAuthUser role handling', () => {
  const profile = (over: object) => ({
    id: 'u1', email: 'a@b.co', full_name: 'Ana', phone: null, id_type: 'CC', id_number: '1',
    user_type_code: 'eca', role_code: null, created_at: '2026-01-01T00:00:00Z', ...over,
  })

  it('keeps a role that matches the actor type', () => {
    expect(mapToAuthUser(profile({ role_code: 'eca_warehouse' })).role).toBe('eca_warehouse')
  })

  it('drops a role that belongs to another actor type', () => {
    expect(mapToAuthUser(profile({ user_type_code: 'association', role_code: 'eca_admin' })).role).toBeNull()
    expect(mapToAuthUser(profile({ user_type_code: 'recycler', role_code: 'eca_admin' })).role).toBeNull()
  })

  it('does not invent permissions for unknown, legacy or missing roles', () => {
    expect(mapToAuthUser(profile({ role_code: 'superadmin' })).role).toBeNull()
    expect(mapToAuthUser(profile({ role_code: 'operador_eca' })).role).toBeNull()
    expect(mapToAuthUser(profile({ role_code: null })).role).toBeNull()
  })

  it('does not fabricate profile fields the API did not send', () => {
    const user = mapToAuthUser(profile({ role_code: 'eca_admin' }))
    expect(Object.keys(user).sort()).toEqual([
      'capabilities', 'created_at', 'email', 'email_verified_at', 'full_name', 'id', 'is_active', 'phone', 'role', 'user_type',
    ])
  })

  it('takes capabilities from the server and never invents them', () => {
    expect(mapToAuthUser(profile({ role_code: 'eca_admin', capabilities: ['weighings.view'] })).capabilities).toEqual(['weighings.view'])
    expect(mapToAuthUser(profile({ role_code: 'eca_admin' })).capabilities).toEqual([])
  })
})
