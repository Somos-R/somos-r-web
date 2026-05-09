import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar } from '../ui'
import { useAuthStore } from '../../hooks/useAuth'

export default function DashboardLayout() {
  const { logout } = useAuthStore()
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
          <Outlet />
        </Box>
      </Box>

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} maxWidth="xs">
        <DialogTitle>¿Cerrar sesión?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">Tu sesión actual se cerrará.</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleLogout}>Cerrar sesión</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showToast}
        onClose={() => setShowToast(false)}
        message="Sesión cerrada exitosamente"
        severity="success"
      />
    </Box>
  )
}
