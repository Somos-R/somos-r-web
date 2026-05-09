import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import { useAuthStore } from '../hooks/useAuth'
import '../styles/LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()

  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [token, navigate])

  return (
    <div className="login-page">
      <div className="login-container">
        <LoginForm onSuccess={() => navigate('/')} />
      </div>
    </div>
  )
}
