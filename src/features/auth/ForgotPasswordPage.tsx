import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'
import { Alert, Button, Input } from '../../components/ui'
import { getApiErrorMessage } from '../../lib/apiError'
import { t } from '../../lib/i18n'
import { authService } from '../../services/auth'
import { AuthCard, AuthShell } from './AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError(t.auth.validation.emailInvalid)
      return
    }
    setIsSubmitting(true)
    setServerError('')
    try {
      await authService.forgotPassword(email.trim())
      // Same message whether or not the account exists: never reveal which emails are registered.
      setSent(true)
    } catch (err) {
      setServerError(getApiErrorMessage(err, t.errors.validation))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <AuthCard title={t.account.forgot.title} subtitle={sent ? undefined : t.account.forgot.subtitle}>
        {sent ? (
          <Alert severity="success">{t.account.forgot.sent}</Alert>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label={t.auth.emailLabel}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
              placeholder={t.auth.emailPlaceholder}
              disabled={isSubmitting}
              error={!!emailError}
              helperText={emailError}
            />
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <Button type="submit" fullWidth loading={isSubmitting} disabled={!email}>
              {t.account.forgot.submit}
            </Button>
          </form>
        )}
        <Link component={RouterLink} to="/login" textAlign="center" variant="body2">
          {t.account.backToLogin}
        </Link>
      </AuthCard>
    </AuthShell>
  )
}
