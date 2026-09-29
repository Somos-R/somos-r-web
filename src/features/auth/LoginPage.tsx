import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AuthShell } from './AuthShell'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  return (
    <AuthShell>
      <LoginForm onSuccess={() => navigate('/')} />
    </AuthShell>
  )
}
