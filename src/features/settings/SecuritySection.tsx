import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation } from '@tanstack/react-query'
import { Alert, Button, Card, CardContent, CardHeader, FormDrawer, Snackbar, type FormFieldDef } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../lib/apiError'
import { setLoginNotice } from '../../lib/loginNotice'
import { clearSession } from '../../lib/session'
import { validatePassword } from '../../lib/passwordPolicy'
import { t } from '../../lib/i18n'
import { authService } from '../../services/auth'

const copy = t.account.security

export default function SecuritySection() {
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const changePassword = useMutation({
    meta: { silent: true },
    mutationFn: (values: Record<string, string>) =>
      authService.changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      // The backend revoked every session, this one included: a logout call would only 401.
      // Leave the notice for the login screen, which is where clearing the session lands.
      setLoginNotice(copy.changePassword.notice)
      clearSession()
    },
    onError: (err) => setSnackbar({ open: true, message: getApiErrorMessage(err, t.errors.validation), severity: 'error' }),
  })

  const resendVerification = useMutation({
    meta: { silent: true },
    mutationFn: () => authService.resendVerification(),
    onSuccess: () => setSnackbar({ open: true, message: copy.emailVerification.sent, severity: 'success' }),
    onError: (err) => setSnackbar({ open: true, message: getApiErrorMessage(err, t.errors.network), severity: 'error' }),
  })

  const fields: FormFieldDef[] = [
    { name: 'current_password', label: copy.changePassword.currentLabel, type: 'password', required: true },
    {
      name: 'new_password',
      label: copy.changePassword.newLabel,
      type: 'password',
      required: true,
      validate: validatePassword,
    },
  ]

  const emailPending = user !== null && !user.email_verified_at

  return (
    <>
      <Card>
        <CardHeader title={copy.title} />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">{copy.changePassword.description}</Typography>
            <Button variant="outlined" onClick={() => setDrawerOpen(true)}>{copy.changePassword.button}</Button>
          </Box>

          {user && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {emailPending ? (
                <Alert severity="warning">{copy.emailVerification.unverified}</Alert>
              ) : (
                <Typography variant="body2" color="text.secondary">{copy.emailVerification.verified}</Typography>
              )}
              {emailPending && (
                <Box>
                  <Button variant="outlined" loading={resendVerification.isPending} onClick={() => resendVerification.mutate()}>
                    {copy.emailVerification.resend}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={copy.changePassword.drawerTitle}
        fields={fields}
        onSubmit={(values) => changePassword.mutate(values)}
        isSubmitting={changePassword.isPending}
        submitLabel={copy.changePassword.submit}
      />
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </>
  )
}
