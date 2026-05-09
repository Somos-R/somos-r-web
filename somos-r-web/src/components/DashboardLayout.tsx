import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'
import { useRoles } from '../hooks/useRoles'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import '../styles/DashboardLayout.css'

import { LayoutDashboard, Recycle, Scale, TrendingUp, Settings, LogOut, CheckCircle2, Leaf } from 'lucide-react'

const ALL_NAV_ITEMS = [
  { to: '/',             label: 'Dashboard',     icon: <LayoutDashboard className="w-5 h-5" />, end: true,  requiresECA: true,  requiresAsoc: false },
  { to: '/recicladores', label: 'Recicladores',  icon: <Recycle className="w-5 h-5" />, end: false, requiresECA: false, requiresAsoc: true  },
  { to: '/pesajes',      label: 'Pesajes',        icon: <Scale className="w-5 h-5" />, end: false, requiresECA: true,  requiresAsoc: false },
  { to: '/reportes',     label: 'Reportes',       icon: <TrendingUp className="w-5 h-5" />, end: false, requiresECA: true,  requiresAsoc: false },
  { to: '/configuracion',label: 'Configuración',  icon: <Settings className="w-5 h-5" />, end: false, requiresECA: false, requiresAsoc: false },
]

// Formato hora local colombiana
function formatTime(date: Date) {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatDate(date: Date) {
  return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  operador_eca:      { label: 'Operador ECA',   cls: 'text-blue-300 bg-blue-900/40' },
  admin_eca:         { label: 'Admin ECA',       cls: 'text-indigo-300 bg-indigo-900/40' },
  admin_asociacion:  { label: 'Admin Asociación',cls: 'text-green-300 bg-green-900/40' },
  superadmin:        { label: 'Super Admin',     cls: 'text-yellow-300 bg-yellow-900/40' },
  recycler:          { label: 'Reciclador',      cls: 'text-green-300 bg-green-900/40' },
  citizen:           { label: 'Ciudadano',       cls: 'text-gray-300 bg-gray-700/40' },
}

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const { canSeePesajes, canSeeRecicladores } = useRoles()
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState(false)
  const [now, setNow] = useState(new Date())

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.requiresECA && !canSeePesajes) return false
    if (item.requiresAsoc && !canSeeRecicladores) return false
    return true
  })

  // Reloj en tiempo real — actualiza cada 30 s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = () => {
    setShowConfirm(false)
    setToast(true)
    setTimeout(() => {
      logout()
    }, 1200)
  }

  const roleBadge = ROLE_BADGE[user?.role ?? 'operador_eca'] ?? ROLE_BADGE.operador_eca

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo"><Leaf className="w-6 h-6 text-green-400" /></span>
          <span className="sidebar-title">Somos R</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
              }
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.full_name ?? 'Admin'}</span>
            <span className={`sidebar-user-role-badge ${roleBadge.cls}`}>
              {roleBadge.label}
            </span>
          </div>
          <button onClick={() => setShowConfirm(true)} className="sidebar-logout" title="Cerrar sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-datetime">
            <span className="header-time">{formatTime(now)}</span>
            <span className="header-date">{formatDate(now)}</span>
          </div>
          <span className="header-eca">
            {'eca_id' in (user ?? {}) && (user as { eca_id?: string }).eca_id
              ? `ECA: ${(user as { eca_id: string }).eca_id}`
              : 'Portal ECA'}
          </span>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión?</DialogTitle>
            <DialogDescription>Tu sesión actual se cerrará.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="toast flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Sesión cerrada exitosamente
        </div>
      )}
    </div>
  )
}
