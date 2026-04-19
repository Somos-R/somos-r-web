import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'
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

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/recicladores', label: 'Recicladores', icon: '♻️', end: false },
  { to: '/pesajes', label: 'Pesajes', icon: '⚖️', end: false },
  { to: '/reportes', label: 'Reportes', icon: '📈', end: false },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️', end: false },
]

// Formato hora local colombiana
function formatTime(date: Date) {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatDate(date: Date) {
  return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:    { label: 'Admin',     cls: 'text-blue-300 bg-blue-900/40' },
  recycler: { label: 'Reciclador', cls: 'text-green-300 bg-green-900/40' },
  citizen:  { label: 'Ciudadano', cls: 'text-gray-300 bg-gray-700/40' },
}

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState(false)
  const [now, setNow] = useState(new Date())

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

  const roleBadge = ROLE_BADGE[user?.role ?? 'admin'] ?? ROLE_BADGE.admin

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">♻️</span>
          <span className="sidebar-title">Somos R</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
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
            🚪
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
            {user?.role === 'admin' && 'eca_id' in (user ?? {})
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
        <div className="toast">
          ✅ Sesión cerrada exitosamente
        </div>
      )}
    </div>
  )
}
