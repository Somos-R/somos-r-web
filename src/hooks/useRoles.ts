import { useAuthStore } from './useAuth'

export function useRoles() {
  const { user } = useAuthStore()
  const role = user?.role

  return {
    canSeeDashboard: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeeWeighings: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeeReports: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeeRecyclers: role === 'admin_asociacion' || role === 'superadmin',
    canSeeSettings: role !== undefined,
    canSeeInventory: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    canSeeTransactions: role === 'operador_eca' || role === 'admin_eca' || role === 'superadmin',
    isOperadorEca: role === 'operador_eca',
    isAdminEca: role === 'admin_eca',
    isAdminAsociacion: role === 'admin_asociacion',
    isSuperadmin: role === 'superadmin',
  }
}
