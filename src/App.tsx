import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './features/auth/LoginPage'
import Dashboard from './features/dashboard/Dashboard'
import Recicladores from './features/recicladores/Recicladores'
import Pesajes from './features/pesajes/Pesajes'
import Inventario from './features/inventario/Inventario'
import Transacciones from './features/transacciones/Transacciones'
import Reportes from './features/reportes/Reportes'
import Configuracion from './features/configuracion/Configuracion'

function NotFound() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>404</h1>
        <p>Página no encontrada</p>
        <a href="/">Volver al inicio</a>
      </div>
    </div>
  )
}

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
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/transacciones" element={<Transacciones />} />
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
