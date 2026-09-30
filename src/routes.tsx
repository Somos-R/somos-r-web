import { ArrowLeftRight, BarChart2, LayoutDashboard, Package, Scale, Settings, UserCog, Users } from 'lucide-react'
import { Dashboard, Inventory, Recyclers, Reports, SettingsPage, Staff, Transactions, Weighings } from './lazyPages'
import { t } from './lib/i18n'
import type { Permission } from './lib/permissions'

export interface AppRoute {
  path: string
  /** Needed to open the page; the sidebar hides the entry without it and the route shows a 403. */
  permission: Permission
  label: string
  icon: React.ReactNode
  element: React.ReactNode
}

// Single source for both the sidebar and the router, so a page can't be reachable
// without going through its guard, nor listed in the menu without being routed.
export const APP_ROUTES: AppRoute[] = [
  { path: '/', permission: 'dashboard.view', label: t.nav.dashboard, icon: <LayoutDashboard size={20} />, element: <Dashboard /> },
  { path: '/recicladores', permission: 'recyclers.view', label: t.nav.recicladores, icon: <Users size={20} />, element: <Recyclers /> },
  { path: '/pesajes', permission: 'weighings.view', label: t.nav.pesajes, icon: <Scale size={20} />, element: <Weighings /> },
  { path: '/inventario', permission: 'inventory.view', label: t.nav.inventario, icon: <Package size={20} />, element: <Inventory /> },
  { path: '/transacciones', permission: 'transactions.view', label: t.nav.transacciones, icon: <ArrowLeftRight size={20} />, element: <Transactions /> },
  { path: '/personal', permission: 'staff.view', label: t.nav.personal, icon: <UserCog size={20} />, element: <Staff /> },
  { path: '/reportes', permission: 'reports.view', label: t.nav.reportes, icon: <BarChart2 size={20} />, element: <Reports /> },
  { path: '/configuracion', permission: 'settings.view', label: t.nav.configuracion, icon: <Settings size={20} />, element: <SettingsPage /> },
]

/** First page the user may open: where `/` sends someone who can't see the dashboard. */
export function getHomePath(can: (permission: Permission) => boolean): string {
  return APP_ROUTES.find((route) => can(route.permission))?.path ?? '/configuracion'
}
