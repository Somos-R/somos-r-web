import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui'
import { useAuthStore } from '../../hooks/useAuth'
import { t } from '../../lib/i18n'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { login, isLoading, error } = useAuthStore()
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const validate = (): boolean => {
    let valid = true
    if (!email) { setEmailError(t.auth.validation.emailRequired); valid = false }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError(t.auth.validation.emailInvalid); valid = false }
    else setEmailError('')
    if (!password) { setPasswordError(t.auth.validation.passwordRequired); valid = false }
    else if (password.length < 6) { setPasswordError(t.auth.validation.passwordMinLength); valid = false }
    else setPasswordError('')
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await login(email, password)
      onSuccess?.()
    } catch {
      // error handled by the store
    }
  }

  return (
    <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={700} textAlign="center" mb={3}>
        {t.auth.loginTitle}
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Input
          label={t.auth.emailLabel}
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
          placeholder={t.auth.emailPlaceholder}
          disabled={isLoading}
          error={!!emailError}
          helperText={emailError}
        />

        <Input
          label={t.auth.passwordLabel}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
          placeholder={t.auth.passwordPlaceholder}
          disabled={isLoading}
          error={!!passwordError}
          helperText={passwordError}
          endAdornment={
            <IconButton size="small" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </IconButton>
          }
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          loading={isLoading}
          disabled={!email || !password}
        >
          {t.auth.loginButton}
        </Button>
      </Box>
    </Paper>
  )
}
