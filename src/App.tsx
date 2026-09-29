import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useAuth } from './hooks/useAuth'
import { Button } from './components/ui'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './features/auth/LoginPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import SetPasswordPage from './features/auth/SetPasswordPage'
import VerifyEmailPage from './features/auth/VerifyEmailPage'
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

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {children}
    </Box>
  )
}

export default function App() {
  const { isAuthenticated, isUserLoading, userError, retryUser, logout } = useAuth()

  // Roles come from the server profile, so nothing role-dependent renders before it arrives.
  if (isAuthenticated && isUserLoading) {
    return (
      <FullScreen>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">{t.auth.session.loading}</Typography>
      </FullScreen>
    )
  }

  if (isAuthenticated && userError) {
    return (
      <FullScreen>
        <Typography>{t.auth.session.loadError}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={() => retryUser()}>{t.auth.session.retry}</Button>
          <Button variant="outlined" onClick={() => logout()}>{t.auth.session.logout}</Button>
        </Box>
      </FullScreen>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />

        {/* Public: the emailed links and password recovery work without a session. */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/activate" element={<SetPasswordPage mode="activate" />} />
        <Route path="/reset-password" element={<SetPasswordPage mode="reset" />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {isAuthenticated ? (
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
