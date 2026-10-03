import { Fragment, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Input, Loader, Select, Snackbar,
} from '../../components/ui'
import { getApiErrorMessage, getErrorCode } from '../../lib/apiError'
import { interpolate, t } from '../../lib/i18n'
import { applicationsQueries } from '../../queries/applications'
import { catalogQueries } from '../../queries/catalogs'
import { AFFECTED } from '../../queries/invalidation'
import {
  applicationsService, type ApplicationField, type ApplicationStatus, type ApplicationView,
} from '../../services/applications'
import { AuthCard, AuthShell } from '../auth/AuthShell'
import { changedFields, FIELD_ORDER, toValues, validateField, type FormValues } from './applicationFields'
import ApplicationDocuments from './ApplicationDocuments'
import RequestAccessLinkForm from './RequestAccessLinkForm'

const STATUS_SEVERITY: Record<ApplicationStatus, 'info' | 'success' | 'warning' | 'error'> = {
  draft: 'info',
  submitted: 'success',
  in_review: 'info',
  changes_requested: 'warning',
  approved: 'success',
  rejected: 'error',
  suspended: 'error',
}

// The name and the address take the whole row; the rest sit two by two.
const FULL_ROW: ApplicationField[] = ['legal_name', 'address']

type Errors = Partial<Record<ApplicationField, string>>

// Shown while the catalog loads (or if it fails): the same kinds the rest of the app offers.
const FALLBACK_DOCUMENT_TYPES = [
  { code: 'CC', label: t.recicladores.register.documentTypes.CC },
  { code: 'CE', label: t.recicladores.register.documentTypes.CE },
  { code: 'TI', label: t.recicladores.register.documentTypes.TI },
  { code: 'PA', label: t.recicladores.register.documentTypes.PA },
]

function InvalidLink() {
  return (
    <AuthShell>
      <AuthCard title={t.solicitud.invalidLink.title} subtitle={t.solicitud.invalidLink.message}>
        <RequestAccessLinkForm />
      </AuthCard>
    </AuthShell>
  )
}

function Editor({ token, view }: { token: string; view: ApplicationView }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<FormValues>(() => toValues(view))
  const [errors, setErrors] = useState<Errors>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  const changes = changedFields(view, values)
  const dirty = Object.keys(changes).length > 0
  const labels = t.solicitud.form.fields
  const { data: documentTypes = FALLBACK_DOCUMENT_TYPES } = useQuery(catalogQueries.documentTypes())
  const documentOptions = documentTypes.map((d) => ({ value: d.code, label: d.label }))

  // A failure (the application was locked or changed meanwhile) is reported by the global handler and the
  // request is read again.
  const onFresh = (next: ApplicationView) => {
    queryClient.setQueryData(applicationsQueries.current(token).queryKey, next)
    setValues(toValues(next))
  }

  const save = useMutation({
    meta: { refreshOnError: AFFECTED.applicationChanged },
    mutationFn: () => applicationsService.update(token, changes),
    onSuccess: (next) => { onFresh(next); setSavedNotice(true) },
  })

  const submit = useMutation({
    meta: { refreshOnError: AFFECTED.applicationChanged },
    mutationFn: () => applicationsService.submit(token),
    onSuccess: onFresh,
    onSettled: () => setConfirmOpen(false),
  })

  const handleSave = () => {
    const next: Errors = {}
    for (const field of Object.keys(changes) as ApplicationField[]) next[field] = validateField(field, values[field])
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    save.mutate()
  }

  const change = (field: ApplicationField, value: string) => {
    setValues((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: undefined }))
  }

  const isMissing = (field: ApplicationField) => view.missing_fields.includes(field) && values[field].trim() === ''
  // A missing required document comes as `documents:<code>`: it is named with the label the server gives it.
  const { data: documentSlots } = useQuery(applicationsQueries.documents(token))
  const documentLabels = new Map((documentSlots ?? []).map((s) => [s.document_type.code, s.document_type.label]))
  const missingLabels = view.missing_fields.map((f) =>
    f.startsWith('documents:') ? (documentLabels.get(f.slice('documents:'.length)) ?? f.slice('documents:'.length)) : (labels[f as ApplicationField] ?? f),
  )
  const busy = save.isPending || submit.isPending
  // The documents the reviewer sent back, listed with the general reason (each also carries its own verdict below).
  const returnedDocuments = view.feedback?.documents ?? []

  return (
    <AuthShell wide>
      <AuthCard title={t.solicitud.form.title} subtitle={t.solicitud.form.subtitle}>
        <Alert severity={STATUS_SEVERITY[view.status] ?? 'info'}>{t.solicitud.status[view.status] ?? view.status}</Alert>
        {view.status === 'changes_requested' && (view.feedback?.summary || returnedDocuments.length > 0) && (
          <Alert severity="warning">
            <Typography variant="subtitle2" component="h2">{t.solicitud.form.feedbackTitle}</Typography>
            {/* The reviewer's own words, shown as text (React escapes it) and keeping their line breaks. */}
            {view.feedback?.summary && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{view.feedback.summary}</Typography>
            )}
            {returnedDocuments.length > 0 && (
              <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                {returnedDocuments.map((d) => (
                  <li key={d.code}>
                    <Typography variant="body2" component="span">
                      <strong>{d.label}</strong>: {t.solicitud.documents.status[d.status] ?? d.status}
                      {d.comment ? ` · ${d.comment}` : ''}
                    </Typography>
                  </li>
                ))}
              </Box>
            )}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          {interpolate(t.solicitud.form.applicantEmail, { email: view.applicant_email })}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {FIELD_ORDER.map((field) => {
            const hint = errors[field] ?? (isMissing(field) ? t.solicitud.form.missingHint : undefined)
            const disabled = !view.can_edit || busy
            return (
              <Fragment key={field}>
                {field === 'applicant_name' && (
                  <Typography variant="body2" color="text.secondary" sx={{ gridColumn: { sm: '1 / -1' } }}>
                    {t.solicitud.form.applicantAdmin}
                  </Typography>
                )}
                <Box sx={{ gridColumn: FULL_ROW.includes(field) ? { sm: '1 / -1' } : undefined }}>
                  {field === 'applicant_id_type' ? (
                    <Select
                      label={labels[field]}
                      value={values[field]}
                      onChange={(e) => change(field, e.target.value)}
                      options={documentOptions}
                      disabled={disabled}
                      error={!!errors[field]}
                      helperText={hint}
                    />
                  ) : (
                    <Input
                      label={labels[field]}
                      type={field === 'contact_email' ? 'email' : field === 'contact_phone' || field === 'applicant_phone' ? 'tel' : 'text'}
                      value={values[field]}
                      onChange={(e) => change(field, e.target.value)}
                      disabled={disabled}
                      error={!!errors[field]}
                      helperText={hint}
                    />
                  )}
                </Box>
              </Fragment>
            )
          })}
        </Box>

        <ApplicationDocuments token={token} canEdit={view.can_edit && !busy} />

        {view.can_edit && missingLabels.length > 0 && (
          <Alert severity="warning">{interpolate(t.solicitud.form.missingSummary, { fields: missingLabels.join(', ') })}</Alert>
        )}
        {view.submission_count > 0 && (
          <Typography variant="caption" color="text.secondary">
            {interpolate(t.solicitud.form.submissionsLeft, { count: view.submissions_left })}
          </Typography>
        )}

        {view.can_edit && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            {dirty && view.can_submit && (
              <Typography variant="caption" color="text.secondary">{t.solicitud.form.dirtyHint}</Typography>
            )}
            <Button variant="outlined" onClick={handleSave} loading={save.isPending} disabled={!dirty || submit.isPending}>
              {t.solicitud.form.save}
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!view.can_submit || dirty || busy}>
              {t.solicitud.form.submit}
            </Button>
          </Box>
        )}

        <Link component={RouterLink} to="/login" textAlign="center" variant="body2">
          {t.solicitud.backToLogin}
        </Link>
      </AuthCard>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>{t.solicitud.form.confirm.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t.solicitud.form.confirm.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirmOpen(false)}>{t.solicitud.form.confirm.back}</Button>
          <Button loading={submit.isPending} onClick={() => submit.mutate()}>{t.solicitud.form.confirm.confirm}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={savedNotice}
        message={t.solicitud.form.saved}
        severity="success"
        onClose={() => setSavedNotice(false)}
      />
    </AuthShell>
  )
}

/** The applicant's own request, opened with the token of the emailed link (held in memory only). */
export default function ApplicationForm({ token }: { token: string }) {
  const { data: view, isLoading, error, refetch } = useQuery(applicationsQueries.current(token))

  if (isLoading) {
    return (
      <AuthShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader /></Box>
      </AuthShell>
    )
  }

  if (error || !view) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status
    if (status === 401 || getErrorCode(error) === 'invalid_application_link') return <InvalidLink />
    return (
      <AuthShell>
        <AuthCard title={t.solicitud.form.title}>
          <Alert severity="error">{getApiErrorMessage(error, t.solicitud.form.loadError)}</Alert>
          <Button fullWidth onClick={() => refetch()}>{t.solicitud.form.retry}</Button>
        </AuthCard>
      </AuthShell>
    )
  }

  return <Editor key={view.id} token={token} view={view} />
}
