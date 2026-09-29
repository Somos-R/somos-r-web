import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { Eye, EyeOff } from 'lucide-react'
import { Alert, Button, Input } from '../../components/ui'
import { getApiErrorMessage } from '../../lib/apiError'
import { validatePassword, validatePasswordConfirmation } from '../../lib/passwordPolicy'
import { t } from '../../lib/i18n'
import { authService } from '../../services/auth'
import { AuthCard, AuthShell } from './AuthShell'
import { useUrlToken } from './useUrlToken'

type Mode = 'activate' | 'reset'

const isInvalidLink = (error: unknown) => (error as { response?: { status?: number } })?.response?.status === 400

/**
 * Landing page of the emailed links that set a password: `/activate` (a verified recycler
 * creates theirs) and `/reset-password` (forgot-password flow). Same form, different endpoint.
 */
export default function SetPasswordPage({ mode }: { mode: Mode }) {
  const copy = mode === 'activate' ? t.account.activate : t.account.reset
  const token = useUrlToken()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(token === null)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    const next = {
      password: validatePassword(password),
      confirmation: validatePasswordConfirmation(password, confirmation),
    }
    setErrors(next)
    if (next.password || next.confirmation) return

    setIsSubmitting(true)
    setServerError('')
    try {
      await (mode === 'activate' ? authService.activate(token, password) : authService.resetPassword(token, password))
      setDone(true)
    } catch (err) {
      if (isInvalidLink(err)) setLinkInvalid(true)
      else setServerError(getApiErrorMessage(err, t.errors.validation))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (linkInvalid) {
    return (
      <AuthShell>
        <AuthCard title={t.account.invalidLink.title} subtitle={t.account.invalidLink.message}>
          {mode === 'activate' ? (
            <Typography variant="body2" textAlign="center">{t.account.invalidLink.requestNewActivate}</Typography>
          ) : (
            <Button fullWidth onClick={() => navigate('/forgot-password')}>
              {t.account.invalidLink.requestNewReset}
            </Button>
          )}
          <Link component={RouterLink} to="/login" textAlign="center" variant="body2">
            {t.account.backToLogin}
          </Link>
        </AuthCard>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell>
        <AuthCard title={copy.title}>
          <Alert severity="success">{copy.success}</Alert>
          <Button fullWidth onClick={() => navigate('/login')}>
            {t.account.goToLogin}
          </Button>
        </AuthCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthCard title={copy.title} subtitle={copy.subtitle}>
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label={t.account.password.newLabel}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })) }}
            disabled={isSubmitting}
            error={!!errors.password}
            helperText={errors.password ?? t.account.password.hint}
            endAdornment={
              <IconButton
                size="small"
                aria-label={t.ui.formDrawer.togglePasswordVisibility}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </IconButton>
            }
          />
          <Input
            label={t.account.password.confirmLabel}
            type={showPassword ? 'text' : 'password'}
            value={confirmation}
            onChange={(e) => { setConfirmation(e.target.value); setErrors((p) => ({ ...p, confirmation: undefined })) }}
            disabled={isSubmitting}
            error={!!errors.confirmation}
            helperText={errors.confirmation}
          />
          {serverError && <Alert severity="error">{serverError}</Alert>}
          <Button type="submit" fullWidth loading={isSubmitting} disabled={!password || !confirmation}>
            {copy.submit}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
