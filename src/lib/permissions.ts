// Who may do what, mirrored from the backend (docs/matriz-permisos.md, app/core/permissions.py).
//
// This only decides what the UI shows. The backend enforces every rule and answers 403 on its
// own, so a stale or wrong entry here can hide a button but never grant access.

export type StaffRole =
  | 'association_admin'
  | 'association_operator'
  | 'route_manager'
  | 'eca_admin'
  | 'eca_operator'
  | 'eca_warehouse'

/** A role is only valid for one actor type; a mismatch grants nothing (same rule as the backend). */
export const ROLE_USER_TYPE: Record<StaffRole, 'association' | 'eca'> = {
  association_admin: 'association',
  association_operator: 'association',
  route_manager: 'association',
  eca_admin: 'eca',
  eca_operator: 'eca',
  eca_warehouse: 'eca',
}

export type Permission =
  | 'dashboard.view'
  | 'recyclers.view'
  | 'recyclers.register'
  | 'recyclers.verify'
  | 'weighings.view'
  | 'weighings.create'
  | 'weighings.review'
  | 'weighings.pay'
  | 'inventory.view'
  | 'inventory.edit'
  | 'transactions.view'
  | 'transactions.create'
  | 'transactions.manage'
  | 'transactions.pay'
  | 'reports.view'
  | 'settings.view'

const ALL_STAFF = Object.keys(ROLE_USER_TYPE) as StaffRole[]
const WEIGHINGS_READ: StaffRole[] = ['eca_admin', 'eca_operator', 'eca_warehouse', 'association_admin', 'association_operator']
const PAYMENTS: StaffRole[] = ['eca_admin', 'association_admin']

// Roles allowed for each permission. Keep in sync with backend app/core/permissions.py.
const PERMISSION_ROLES: Record<Permission, StaffRole[]> = {
  // The dashboard is built from weighing stats, so it needs the same access as weighings.
  'dashboard.view': WEIGHINGS_READ,
  'recyclers.view': ALL_STAFF,
  // Registration is a public endpoint; the portal offers it to any staff member.
  'recyclers.register': ALL_STAFF,
  'recyclers.verify': ['association_admin', 'association_operator'],
  'weighings.view': WEIGHINGS_READ,
  'weighings.create': ['eca_admin', 'eca_operator'],
  'weighings.review': ['eca_admin', 'eca_operator', 'association_admin', 'association_operator'],
  'weighings.pay': PAYMENTS,
  'inventory.view': WEIGHINGS_READ,
  'inventory.edit': ['eca_admin', 'eca_warehouse'],
  'transactions.view': ['eca_admin', 'eca_operator', 'eca_warehouse', 'association_admin'],
  'transactions.create': ['eca_admin', 'eca_warehouse'],
  'transactions.manage': ['eca_admin', 'eca_warehouse'],
  'transactions.pay': PAYMENTS,
  'reports.view': WEIGHINGS_READ,
  'settings.view': [], // any signed-in user, see `can`
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && value in ROLE_USER_TYPE
}

interface Subject {
  user_type: string
  role: StaffRole | null
}

/** Signed-in users can always reach settings (change password); everything else needs a role. */
export function can(subject: Subject | null | undefined, permission: Permission): boolean {
  if (!subject) return false
  if (permission === 'settings.view') return true
  return subject.role !== null && PERMISSION_ROLES[permission].includes(subject.role)
}
