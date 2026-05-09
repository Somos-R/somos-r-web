import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input, Select, Alert } from '../../components/ui'
import { useAuthStore } from '../../hooks/useAuth'
import type { UserRole } from '../../types/auth.types'

interface LoginFormProps {
  onSuccess?: () => void
}

const DEV_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin_eca', label: 'Admin ECA' },
  { value: 'operador_eca', label: 'Operador ECA' },
  { value: 'admin_asociacion', label: 'Admin Asociación' },
  { value: 'superadmin', label: 'Superadmin' },
]

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [devRole, setDevRole] = useState<UserRole>('admin_eca')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { login, isLoading, error } = useAuthStore()
  const emailRef = useRef<HTMLInputElement>(null)
  const isDev = import.meta.env.DEV

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const validate = (): boolean => {
    let valid = true
    if (!email) { setEmailError('El email es requerido'); valid = false }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Ingresa un email válido'); valid = false }
    else setEmailError('')
    if (!password) { setPasswordError('La contraseña es requerida'); valid = false }
    else if (password.length < 6) { setPasswordError('Mínimo 6 caracteres'); valid = false }
    else setPasswordError('')
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await login(email, password, isDev ? devRole : undefined)
      onSuccess?.()
    } catch {
      // error manejado por el store
    }
  }

  return (
    <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={700} textAlign="center" mb={3}>
        Portal ECA — Somos R
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
          placeholder="admin@eca.com"
          disabled={isLoading}
          error={!!emailError}
          helperText={emailError}
        />

        <Input
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
          placeholder="••••••••"
          disabled={isLoading}
          error={!!passwordError}
          helperText={passwordError}
          endAdornment={
            <IconButton size="small" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </IconButton>
          }
        />

        {isDev && (
          <Select
            label="Rol (solo DEV)"
            value={devRole}
            onChange={(e) => setDevRole(e.target.value as UserRole)}
            options={DEV_ROLES}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          loading={isLoading}
          disabled={!email || !password}
        >
          Iniciar sesión
        </Button>
      </Box>
    </Paper>
  )
}
