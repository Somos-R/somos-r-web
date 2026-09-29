import type { StaffRole } from '../lib/permissions'

// What `GET /auth/me` returns for each role, transcribed from the backend (app/core/permissions.py,
// CAPABILITIES). Only for fake APIs in tests: the app itself never derives these from the role.
const ECA_ALL = [
  'inventory.edit', 'inventory.view', 'recyclers.view', 'transactions.create', 'transactions.manage',
  'transactions.pay', 'transactions.view', 'weighings.create', 'weighings.pay', 'weighings.review', 'weighings.view',
]

export const CAPABILITIES_BY_ROLE: Record<StaffRole, string[]> = {
  eca_admin: ECA_ALL,
  eca_operator: ['inventory.view', 'recyclers.view', 'transactions.view', 'weighings.create', 'weighings.review', 'weighings.view'],
  eca_warehouse: [
    'inventory.edit', 'inventory.view', 'recyclers.view', 'transactions.create', 'transactions.manage',
    'transactions.view', 'weighings.view',
  ],
  association_admin: [
    'inventory.view', 'recyclers.verify', 'recyclers.view', 'transactions.pay', 'transactions.view',
    'weighings.pay', 'weighings.review', 'weighings.view',
  ],
  association_operator: ['inventory.view', 'recyclers.verify', 'recyclers.view', 'weighings.review', 'weighings.view'],
  route_manager: ['recyclers.view'],
}

export const capabilitiesForRole = (role: StaffRole | null): string[] => (role ? CAPABILITIES_BY_ROLE[role] : [])
