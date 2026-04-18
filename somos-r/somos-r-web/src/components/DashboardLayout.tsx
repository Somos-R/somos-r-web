import { useState } from 'react'
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

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState(false)

  const handleLogout = () => {
    setShowConfirm(false)
    setToast(true)
    setTimeout(() => {
      logout()
    }, 1200)
  }

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
            <span className="sidebar-user-role">ECA Admin</span>
          </div>
          <button onClick={() => setShowConfirm(true)} className="sidebar-logout" title="Cerrar sesión">
            🚪
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
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
