import { useAuthStore } from './useAuth'

export function useRoles() {
  const { user } = useAuthStore()
  const role = user?.role

  return {
    canSeeDashboard: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeePesajes: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeeReportes: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeeRecicladores: role === 'admin_asociacion' || role === 'superadmin',
    canSeeConfiguracion: role !== undefined,
    canSeeInventario: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeeTransacciones: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    isOperadorEca: role === 'operador_eca',
    isAdminEca: role === 'admin_eca',
    isAdminAsociacion: role === 'admin_asociacion',
    isSuperadmin: role === 'superadmin',
  }
}
