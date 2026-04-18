import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import DashboardLayout from './components/DashboardLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Recicladores from './pages/Recicladores'
import Pesajes from './pages/Pesajes'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import NotFound from './pages/NotFound'

export default function App() {
  const { token } = useAuthStore()

  return (
    <Router>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />

        {token ? (
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recicladores" element={<Recicladores />} />
            <Route path="/pesajes" element={<Pesajes />} />
            <Route path="/reportes" element={<Reportes />} />
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
