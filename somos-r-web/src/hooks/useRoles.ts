import { useAuthStore } from './useAuth'
import type { PortalRole } from '../types/auth.types'

function getRoles(user: ReturnType<typeof useAuthStore.getState>['user']): PortalRole[] {
  if (!user) return []
  if ('roles' in user && Array.isArray(user.roles)) return user.roles
  return []
}

export function useRoles() {
  const user = useAuthStore((s) => s.user)
  const roles = getRoles(user)

  return {
    roles,
    isOperadorECA:     roles.includes('operador_eca'),
    isAdminECA:        roles.includes('admin_eca'),
    isAdminAsociacion: roles.includes('admin_asociacion'),
    isSuperAdmin:      roles.includes('superadmin'),
    // Tiene al menos un rol del portal
    isPortalUser:      roles.length > 0,
    // Puede ver secciones ECA (pesajes, reportes, dashboard operativo)
    canSeePesajes:     roles.includes('operador_eca') || roles.includes('admin_eca') || roles.includes('superadmin'),
    // Puede ver sección Asociación (padrón de recicladores)
    canSeeRecicladores: roles.includes('admin_asociacion') || roles.includes('superadmin'),
  }
}
