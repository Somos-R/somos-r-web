// What the UI may show. The list of capabilities comes from the server (`/auth/me`); the backend
// enforces every rule and answers 403 on its own, so this can hide a button but never grant access.

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

/**
 * What the server tells us the user may do (`GET /auth/me` → `capabilities`). Evaluated with the same
 * rule that protects the endpoints, so this file no longer keeps its own role table.
 */
export type ServerPermission =
  | 'recyclers.view'
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
  | 'staff.view'
  | 'staff.invite'
  | 'staff.manage'
  | 'links.view'
  | 'links.request'
  | 'links.decide'

/** Screen-level permissions that are not a server capability: they are derived from one, or need none. */
export type UiPermission = 'dashboard.view' | 'recyclers.register' | 'reports.view' | 'settings.view'

export type Permission = ServerPermission | UiPermission

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && value in ROLE_USER_TYPE
}

interface Subject {
  role: StaffRole | null
  capabilities: readonly string[]
}

// The dashboard and reports are built from weighing data, so they need the same access as weighings.
const UI_RULES: Record<UiPermission, (subject: Subject) => boolean> = {
  'dashboard.view': (s) => s.capabilities.includes('weighings.view'),
  'reports.view': (s) => s.capabilities.includes('weighings.view'),
  // Registration is a public endpoint; the portal offers it to any staff member.
  'recyclers.register': (s) => s.role !== null,
  // Signed-in users can always reach settings (change password).
  'settings.view': () => true,
}

/** Only hides or shows UI: the backend enforces every rule and answers 403 on its own. */
export function can(subject: Subject | null | undefined, permission: Permission): boolean {
  if (!subject) return false
  if (permission in UI_RULES) return UI_RULES[permission as UiPermission](subject)
  return subject.capabilities.includes(permission)
}
