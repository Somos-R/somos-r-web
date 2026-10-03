import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useMutation } from '@tanstack/react-query'
import { Alert, Button, Checkbox, Input, Select } from '../../components/ui'
import { t } from '../../lib/i18n'
import { applicationsService, type OrganizationKind } from '../../services/applications'
import { AuthCard, AuthShell } from '../auth/AuthShell'
import { EMAIL_PATTERN } from './applicationFields'
import RequestAccessLinkForm from './RequestAccessLinkForm'

const TYPE_OPTIONS = (['association', 'eca'] as const).map((value) => ({ value, label: t.solicitud.start.types[value] }))

type Errors = Partial<Record<'legalName' | 'applicantName' | 'email' | 'consent', string>>

/** First step of the application: who is applying and the data-treatment consent. The link to continue comes by email. */
export default function StartApplication() {
  const [view, setView] = useState<'start' | 'resend'>('start')
  const [type, setType] = useState<OrganizationKind>('association')
  const [legalName, setLegalName] = useState('')
  const [applicantName, setApplicantName] = useState('')
  const [email, setEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      applicationsService.start({
        type,
        legal_name: legalName.trim(),
        applicant_name: applicantName.trim(),
        applicant_email: email.trim(),
        ...(taxId.trim() ? { tax_id: taxId.trim() } : {}),
        consent: true,
      }),
    // The answer is the same whether or not this email already applied: never reveal which ones did.
    onSuccess: () => setSent(true),
  })

  const clear = (key: keyof Errors) => setErrors((p) => ({ ...p, [key]: undefined }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Errors = {
      legalName: legalName.trim().length < 2 ? t.solicitud.form.validation.nameShort : undefined,
      applicantName: applicantName.trim().length < 2 ? t.solicitud.form.validation.nameShort : undefined,
      email: EMAIL_PATTERN.test(email.trim()) ? undefined : t.auth.validation.emailInvalid,
      consent: consent ? undefined : t.solicitud.consent.required,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    mutation.mutate()
  }

  if (view === 'resend') {
    return (
      <AuthShell>
        <AuthCard title={t.solicitud.resend.title} subtitle={t.solicitud.resend.subtitle}>
          <RequestAccessLinkForm />
          <Link component="button" type="button" variant="body2" onClick={() => setView('start')}>
            {t.solicitud.resend.back}
          </Link>
        </AuthCard>
      </AuthShell>
    )
  }

  if (sent) {
    return (
      <AuthShell>
        <AuthCard title={t.solicitud.title}>
          <Alert severity="success">{t.solicitud.start.sent}</Alert>
        </AuthCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell wide>
      <AuthCard title={t.solicitud.title} subtitle={t.solicitud.subtitle}>
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select
            label={t.solicitud.start.typeLabel}
            value={type}
            onChange={(e) => setType(e.target.value as OrganizationKind)}
            options={TYPE_OPTIONS}
            disabled={mutation.isPending}
          />
          <Input
            label={t.solicitud.start.legalName}
            value={legalName}
            onChange={(e) => { setLegalName(e.target.value); clear('legalName') }}
            disabled={mutation.isPending}
            error={!!errors.legalName}
            helperText={errors.legalName}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Input
              label={t.solicitud.start.applicantName}
              value={applicantName}
              onChange={(e) => { setApplicantName(e.target.value); clear('applicantName') }}
              disabled={mutation.isPending}
              error={!!errors.applicantName}
              helperText={errors.applicantName}
            />
            <Input
              label={t.solicitud.start.applicantEmail}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clear('email') }}
              disabled={mutation.isPending}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Box>
          <Input
            label={t.solicitud.start.taxId}
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            disabled={mutation.isPending}
          />

          <Box>
            <Typography variant="subtitle2" component="h2" gutterBottom>{t.solicitud.consent.title}</Typography>
            {/* Scrollable text: focusable so a keyboard user can read all of it. */}
            <Box
              role="region"
              aria-label={t.solicitud.consent.title}
              tabIndex={0}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, maxHeight: 120, overflow: 'auto' }}
            >
              <Typography variant="body2" color="text.secondary">{t.solicitud.consent.text}</Typography>
            </Box>
            <Checkbox
              label={t.solicitud.consent.label}
              checked={consent}
              onChange={(checked) => { setConsent(checked); clear('consent') }}
              disabled={mutation.isPending}
              error={!!errors.consent}
              helperText={errors.consent}
            />
          </Box>

          <Button type="submit" fullWidth loading={mutation.isPending}>
            {t.solicitud.start.submit}
          </Button>
        </form>
        <Link component="button" type="button" variant="body2" onClick={() => setView('resend')}>
          {t.solicitud.start.haveOne}
        </Link>
        <Link component={RouterLink} to="/login" textAlign="center" variant="body2">
          {t.solicitud.backToLogin}
        </Link>
      </AuthCard>
    </AuthShell>
  )
}
