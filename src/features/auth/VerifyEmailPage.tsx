import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { Alert, Button } from '../../components/ui'
import { getApiErrorMessage } from '../../lib/apiError'
import { t } from '../../lib/i18n'
import { authService } from '../../services/auth'
import { AuthCard, AuthShell } from './AuthShell'
import { useUrlToken } from './useUrlToken'

type State = 'verifying' | 'verified' | 'invalid' | { error: string }

const isInvalidLink = (error: unknown) => (error as { response?: { status?: number } })?.response?.status === 400

/** Landing page of the "confirm your email" link. The token is single-use, so it is sent once. */
export default function VerifyEmailPage() {
  const token = useUrlToken()
  const navigate = useNavigate()
  const [state, setState] = useState<State>(token ? 'verifying' : 'invalid')
  // React StrictMode runs effects twice in dev; a second call would burn the token and show
  // "invalid link" for a link that had just worked.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    authService
      .verifyEmail(token)
      .then(() => setState('verified'))
      .catch((err) => setState(isInvalidLink(err) ? 'invalid' : { error: getApiErrorMessage(err, t.errors.network) }))
  }, [token])

  return (
    <AuthShell>
      {state === 'verifying' && (
        <AuthCard title={t.account.verify.verifying}>
          <CircularProgress sx={{ alignSelf: 'center' }} />
        </AuthCard>
      )}
      {state === 'verified' && (
        <AuthCard title={t.account.verify.successTitle}>
          <Alert severity="success">{t.account.verify.successMessage}</Alert>
          <Button fullWidth onClick={() => navigate('/')}>{t.account.goToLogin}</Button>
        </AuthCard>
      )}
      {state === 'invalid' && (
        <AuthCard title={t.account.invalidLink.title} subtitle={t.account.invalidLink.message}>
          <Typography variant="body2" textAlign="center">{t.account.invalidLink.requestNewVerify}</Typography>
          <Link component={RouterLink} to="/login" textAlign="center" variant="body2">
            {t.account.goToLogin}
          </Link>
        </AuthCard>
      )}
      {typeof state === 'object' && (
        <AuthCard title={t.account.verify.verifying}>
          <Alert severity="error">{state.error}</Alert>
        </AuthCard>
      )}
    </AuthShell>
  )
}
