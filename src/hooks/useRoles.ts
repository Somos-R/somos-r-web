import { useAuth } from './useAuth'
import { can, type Permission } from '../lib/permissions'

/**
 * Permission checks for the UI. Ask for a capability (`can('weighings.review')`), never for a
 * role name, so the role-to-permission mapping lives in one place (lib/permissions).
 */
export function useRoles() {
  const { user } = useAuth()

  return {
    role: user?.role ?? null,
    can: (permission: Permission) => can(user, permission),
  }
}
