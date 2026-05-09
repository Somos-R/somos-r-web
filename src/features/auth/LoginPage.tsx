import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import { useAuthStore } from '../../hooks/useAuth'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #059669 0%, #0f172a 100%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <LoginForm onSuccess={() => navigate('/')} />
      </Box>
    </Box>
  )
}
