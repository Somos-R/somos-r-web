import { useAuth } from './useAuth'
import { can, type Permission } from '../lib/permissions'

/**
 * Permission checks for the UI. Ask for a capability (`can('weighings.review')`), never for a
 * role name, so the rule lives in one place (lib/permissions) and the list of capabilities comes from the server.
 */
export function useRoles() {
  const { user } = useAuth()

  return {
    role: user?.role ?? null,
    can: (permission: Permission) => can(user, permission),
  }
}
