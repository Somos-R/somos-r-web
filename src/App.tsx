import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './features/auth/LoginPage'
import Dashboard from './features/dashboard/Dashboard'
import Recyclers from './features/recyclers/Recyclers'
import Weighings from './features/weighings/Weighings'
import Inventory from './features/inventory/Inventory'
import Transactions from './features/transactions/Transactions'
import Reports from './features/reports/Reports'
import Settings from './features/settings/Settings'
import { t } from './lib/i18n'

function NotFound() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>{t.notFound.title}</h1>
        <p>{t.notFound.message}</p>
        <a href="/">{t.notFound.backLink}</a>
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
            <Route path="/recicladores" element={<Recyclers />} />
            <Route path="/pesajes" element={<Weighings />} />
            <Route path="/inventario" element={<Inventory />} />
            <Route path="/transacciones" element={<Transactions />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/configuracion" element={<Settings />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}
