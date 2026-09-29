import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from './ErrorBoundary'
import { Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { t } from '../../lib/i18n'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  // Staff of an organization who has no (valid) role can do nothing until an admin assigns one.
  const pendingRole = user !== null && (user.user_type === 'eca' || user.user_type === 'association') && user.role === null
  const [showConfirm, setShowConfirm] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleLogout = () => {
    setShowConfirm(false)
    setShowToast(true)
    setTimeout(() => logout(), 1200)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <Sidebar onLogout={() => setShowConfirm(true)} />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <Box component="main" sx={{ flex: 1, p: 3 }}>
          {pendingRole && <Alert severity="warning" sx={{ mb: 3 }}>{t.account.pendingRole}</Alert>}
          {/* A crash in one page must not take down the menu; changing route clears it. */}
          <ErrorBoundary resetKeys={[location.pathname]}>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} maxWidth="xs">
        <DialogTitle>{t.logout.confirmTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">{t.logout.confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowConfirm(false)}>{t.common.cancel}</Button>
          <Button variant="destructive" onClick={handleLogout}>{t.logout.confirmButton}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showToast}
        onClose={() => setShowToast(false)}
        message={t.logout.successMessage}
        severity="success"
      />
    </Box>
  )
}
