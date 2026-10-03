import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Alert, Button, Input } from '../../components/ui'
import { t } from '../../lib/i18n'
import { applicationsService } from '../../services/applications'
import { EMAIL_PATTERN } from './applicationFields'

/**
 * Asks for a new emailed link to an application already started. The answer is always the same, so
 * nobody can use this to find out which emails applied.
 */
export default function RequestAccessLinkForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sent, setSent] = useState(false)

  const mutation = useMutation({
    mutationFn: (address: string) => applicationsService.requestAccessLink(address),
    onSuccess: () => setSent(true),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError(t.auth.validation.emailInvalid)
      return
    }
    mutation.mutate(email.trim())
  }

  if (sent) return <Alert severity="success">{t.solicitud.resend.sent}</Alert>

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input
        label={t.auth.emailLabel}
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
        disabled={mutation.isPending}
        error={!!emailError}
        helperText={emailError}
      />
      <Button type="submit" fullWidth loading={mutation.isPending} disabled={!email}>
        {t.solicitud.resend.submit}
      </Button>
    </form>
  )
}
