import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import { useRoles } from './hooks/useRoles'
import DashboardLayout from './components/DashboardLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Recicladores from './pages/Recicladores'
import Pesajes from './pages/Pesajes'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import NotFound from './pages/NotFound'

function RoleGuard({ children, allowed }: { children: React.ReactNode; allowed: boolean }) {
  if (!allowed) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { token } = useAuthStore()
  const { canSeePesajes, canSeeRecicladores } = useRoles()

  return (
    <Router>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />

        {token ? (
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/recicladores"
              element={
                <RoleGuard allowed={canSeeRecicladores}>
                  <Recicladores />
                </RoleGuard>
              }
            />
            <Route
              path="/pesajes"
              element={
                <RoleGuard allowed={canSeePesajes}>
                  <Pesajes />
                </RoleGuard>
              }
            />
            <Route
              path="/reportes"
              element={
                <RoleGuard allowed={canSeePesajes}>
                  <Reportes />
                </RoleGuard>
              }
            />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}
