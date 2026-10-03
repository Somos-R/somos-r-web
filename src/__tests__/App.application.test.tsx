import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { mockAdapter } from '../test/helpers'

// The public application to join Somos R. The fake backend below follows the contract: the emailed link's
// token travels in X-Application-Token, only a draft or a "changes requested" application can be edited, what
// is missing decides whether it can be sent, and it can be sent a limited number of times.

const REQUIRED = ['legal_name', 'tax_id', 'legal_representative', 'contact_email', 'contact_phone', 'address', 'city']
const TOKEN = 'good-token'
const copy = t.solicitud
const fields = copy.form.fields

type Json = Record<string, unknown>
interface Seen { method: string; url: string; headers: Json; body?: Json }

let seen: Seen[]
let app: Json
let startFailure: { status: number; code: string } | null
let patchFailure: { status: number; code: string } | null

const base = (over: Json = {}): Json => ({
  id: 'org1', type: 'association', status: 'draft', legal_name: 'Asociación Esperanza', tax_id: null,
  legal_representative: null, contact_email: null, contact_phone: null, address: null, city: null,
  applicant_name: 'Laura Gómez', applicant_email: 'laura@asociacion.org', consent_at: '2026-10-01T00:00:00Z',
  submitted_at: null, submission_count: 0, ...over,
})

/** What the backend adds: what is missing, whether it can be edited and whether it can be sent. */
function view(): Json {
  const missing = REQUIRED.filter((f) => !app[f])
  const canEdit = app.status === 'draft' || app.status === 'changes_requested'
  const left = Math.max(3 - (app.submission_count as number), 0)
  return { ...app, submissions_left: left, can_edit: canEdit, can_submit: canEdit && missing.length === 0 && left > 0, missing_fields: missing }
}

function serveApplications() {
  seen = []
  startFailure = null
  patchFailure = null
  app = base()
  apiClient.defaults.adapter = mockAdapter((c) => {
    const method = String(c.method).toUpperCase()
    const url = String(c.url)
    const headers = (c.headers ?? {}) as unknown as Json
    const body = c.data ? (JSON.parse(String(c.data)) as Json) : undefined
    seen.push({ method, url, headers, body })

    if (method === 'POST' && url === '/applications') {
      if (startFailure) return { status: startFailure.status, data: { detail: 'x', code: startFailure.code } }
      return { status: 202, data: { message: 'enviado' } }
    }
    if (method === 'POST' && url === '/applications/access-link') return { status: 202, data: { message: 'enviado' } }

    if (headers['X-Application-Token'] !== TOKEN) return { status: 401, data: { detail: 'x', code: 'invalid_application_link' } }
    if (method === 'GET' && url === '/applications/current') return { data: view() }
    if (method === 'PATCH' && url === '/applications/current') {
      if (patchFailure) return { status: patchFailure.status, data: { detail: 'x', code: patchFailure.code } }
      if (view().can_edit === false) return { status: 409, data: { detail: 'x', code: 'application_locked' } }
      app = { ...app, ...body }
      return { data: view() }
    }
    if (method === 'POST' && url === '/applications/current/submit') {
      if ((view().missing_fields as string[]).length) return { status: 422, data: { detail: 'x', code: 'application_incomplete' } }
      app = { ...app, status: 'submitted', submission_count: (app.submission_count as number) + 1, submitted_at: '2026-10-02T00:00:00Z' }
      return { data: view() }
    }
    return { status: 404, data: {} }
  })
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

const type = (label: string, text: string) => userEvent.type(screen.getByLabelText(label), text)
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))
const sentRequests = (method: string, url: string) => seen.filter((r) => r.method === method && r.url === url)

describe('application to join Somos R: start (no token)', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    serveApplications()
  })

  it('is public: it does not bounce to /login', () => {
    renderAt('/solicitud')
    expect(window.location.pathname).toBe('/solicitud')
    return screen.findByRole('heading', { name: copy.title })
  })

  it('asks for the consent and for the basics before sending anything', async () => {
    renderAt('/solicitud')
    await click(copy.start.submit)
    expect(screen.getAllByText(copy.form.validation.nameShort)).toHaveLength(2)
    expect(screen.getByText(t.auth.validation.emailInvalid)).toBeInTheDocument()
    expect(screen.getByText(copy.consent.required)).toBeInTheDocument()
    expect(seen).toHaveLength(0)
  })

  it('shows the data-treatment text so the person reads what they accept', async () => {
    renderAt('/solicitud')
    expect(await screen.findByText(copy.consent.text)).toBeInTheDocument()
  })

  it('starts the application with the consent, leaving the optional NIT out when blank', async () => {
    renderAt('/solicitud')
    await type(copy.start.legalName, 'Asociación Esperanza')
    await type(copy.start.applicantName, 'Laura Gómez')
    await type(copy.start.applicantEmail, 'laura@asociacion.org')
    await userEvent.click(screen.getByLabelText(copy.consent.label))
    await click(copy.start.submit)

    expect(await screen.findByText(copy.start.sent)).toBeInTheDocument()
    expect(sentRequests('POST', '/applications')[0].body).toEqual({
      type: 'association', legal_name: 'Asociación Esperanza', applicant_name: 'Laura Gómez',
      applicant_email: 'laura@asociacion.org', consent: true,
    })
  })

  it('sends the NIT and the kind of organization when they were filled in', async () => {
    renderAt('/solicitud')
    await userEvent.click(screen.getByRole('combobox', { name: copy.start.typeLabel }))
    await userEvent.click(await screen.findByRole('option', { name: copy.start.types.eca }))
    await type(copy.start.legalName, 'ECA Norte')
    await type(copy.start.applicantName, 'Pedro Pérez')
    await type(copy.start.applicantEmail, 'pedro@eca.co')
    await type(copy.start.taxId, '900123456-1')
    await userEvent.click(screen.getByLabelText(copy.consent.label))
    await click(copy.start.submit)

    await screen.findByText(copy.start.sent)
    expect(sentRequests('POST', '/applications')[0].body).toMatchObject({ type: 'eca', tax_id: '900123456-1' })
  })

  it('tells the person when the NIT already belongs to an active organization', async () => {
    startFailure = { status: 409, code: 'organization_already_registered' }
    renderAt('/solicitud')
    await type(copy.start.legalName, 'Asociación Esperanza')
    await type(copy.start.applicantName, 'Laura Gómez')
    await type(copy.start.applicantEmail, 'laura@asociacion.org')
    await userEvent.click(screen.getByLabelText(copy.consent.label))
    await click(copy.start.submit)

    expect(await screen.findByText(t.apiErrors.organization_already_registered)).toBeInTheDocument()
    expect(screen.queryByText(copy.start.sent)).not.toBeInTheDocument()
  })

  it('asks for a new link by email, with the same answer whatever the email', async () => {
    renderAt('/solicitud')
    await click(copy.start.haveOne)
    await type(t.auth.emailLabel, 'laura@asociacion.org')
    await click(copy.resend.submit)

    expect(await screen.findByText(copy.resend.sent)).toBeInTheDocument()
    expect(sentRequests('POST', '/applications/access-link')[0].body).toEqual({ email: 'laura@asociacion.org' })
  })
})

describe('application to join Somos R: complete and send (with the emailed token)', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    serveApplications()
  })

  const open = async () => {
    renderAt(`/solicitud?token=${TOKEN}`)
    await screen.findByLabelText(fields.legal_name)
  }

  it('takes the token out of the address bar and sends it in X-Application-Token', async () => {
    await open()
    expect(window.location.search).toBe('')
    const read = sentRequests('GET', '/applications/current')[0]
    expect(read.headers['X-Application-Token']).toBe(TOKEN)
  })

  it('shows what was saved, the applicant, the status and what is still missing', async () => {
    app = base({ city: 'Cali' })
    await open()
    expect(screen.getByLabelText(fields.legal_name)).toHaveValue('Asociación Esperanza')
    expect(screen.getByLabelText(fields.city)).toHaveValue('Cali')
    expect(screen.getByText(copy.status.draft)).toBeInTheDocument()
    expect(screen.getByText(/laura@asociacion\.org/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${copy.form.missingSummary.split('{{')[0]}.*${fields.tax_id}`))).toBeInTheDocument()
    expect(screen.getAllByText(copy.form.missingHint)).toHaveLength(5) // tax id, representative, email, phone, address
    expect(screen.getByRole('button', { name: copy.form.submit })).toBeDisabled()
    expect(screen.getByRole('button', { name: copy.form.save })).toBeDisabled() // nothing changed yet
  })

  it('saves only what changed, and an emptied optional field is sent as null', async () => {
    app = base({ city: 'Cali', address: 'Calle 1' })
    await open()
    await type(fields.tax_id, '900123456-1')
    await userEvent.clear(screen.getByLabelText(fields.city))
    await click(copy.form.save)

    expect(await screen.findByText(copy.form.saved)).toBeInTheDocument()
    expect(sentRequests('PATCH', '/applications/current')[0].body).toEqual({ tax_id: '900123456-1', city: null })
    expect(screen.getByRole('button', { name: copy.form.save })).toBeDisabled() // saved: nothing pending
    expect(screen.getByLabelText(fields.city)).toHaveValue('')
  })

  it('does not send a name that is too short or an email that is not one', async () => {
    await open()
    await userEvent.clear(screen.getByLabelText(fields.legal_name))
    await type(fields.legal_name, 'A')
    await type(fields.contact_email, 'no-es-correo')
    await click(copy.form.save)

    expect(screen.getByText(copy.form.validation.nameShort)).toBeInTheDocument()
    expect(screen.getByText(copy.form.validation.emailInvalid)).toBeInTheDocument()
    expect(sentRequests('PATCH', '/applications/current')).toHaveLength(0)
  })

  it('can be sent only when complete and saved, and asks for confirmation first', async () => {
    app = base({ tax_id: '9001', legal_representative: 'Laura Gómez', contact_email: 'a@b.co', contact_phone: '3001234567', address: 'Calle 1' })
    await open()
    expect(screen.getByRole('button', { name: copy.form.submit })).toBeDisabled() // the city is missing

    await type(fields.city, 'Cali')
    expect(screen.getByRole('button', { name: copy.form.submit })).toBeDisabled() // typed but not saved
    await click(copy.form.save)
    await screen.findByText(copy.form.saved)
    await waitFor(() => expect(screen.getByRole('button', { name: copy.form.submit })).toBeEnabled())

    await click(copy.form.submit)
    expect(await screen.findByText(copy.form.confirm.title)).toBeInTheDocument()
    expect(sentRequests('POST', '/applications/current/submit')).toHaveLength(0)
    await click(copy.form.confirm.confirm)

    expect(await screen.findByText(copy.status.submitted)).toBeInTheDocument()
    expect(sentRequests('POST', '/applications/current/submit')).toHaveLength(1)
    // Locked: nothing to edit or send until corrections are requested.
    expect(screen.getByLabelText(fields.legal_name)).toBeDisabled()
    expect(screen.queryByRole('button', { name: copy.form.submit })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.form.save })).not.toBeInTheDocument()
  })

  it('opens an application whose corrections were requested as editable, and says how many sends are left', async () => {
    app = base({
      status: 'changes_requested', tax_id: '9001', legal_representative: 'L', contact_email: 'a@b.co',
      contact_phone: '300', address: 'Calle 1', city: 'Cali', submission_count: 1,
    })
    await open()
    expect(screen.getByText(copy.status.changes_requested)).toBeInTheDocument()
    expect(screen.getByLabelText(fields.legal_name)).toBeEnabled()
    expect(screen.getByText(copy.form.submissionsLeft.replace('{{count}}', '2'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.form.submit })).toBeEnabled()
  })

  it.each([
    ['in_review', copy.status.in_review],
    ['approved', copy.status.approved],
    ['rejected', copy.status.rejected],
  ])('a %s application is read-only', async (status, text) => {
    app = base({ status })
    await open()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByLabelText(fields.legal_name)).toBeDisabled()
    expect(screen.queryByRole('button', { name: copy.form.save })).not.toBeInTheDocument()
  })

  it('explains a refusal to save (the application was locked meanwhile) in Spanish and reads it again', async () => {
    await open()
    patchFailure = { status: 409, code: 'application_locked' }
    await type(fields.city, 'Cali')
    await click(copy.form.save)

    expect(await screen.findByText(t.apiErrors.application_locked)).toBeInTheDocument()
    await waitFor(() => expect(sentRequests('GET', '/applications/current').length).toBeGreaterThan(1))
  })
})

describe('application to join Somos R: a link that does not work', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    serveApplications()
  })

  it('says so and offers a new link, without ever treating it as an expired session', async () => {
    renderAt('/solicitud?token=wrong')
    expect(await screen.findByRole('heading', { name: copy.invalidLink.title })).toBeInTheDocument()
    expect(sentRequests('POST', '/auth/refresh')).toHaveLength(0)
    expect(window.location.pathname).toBe('/solicitud')

    await type(t.auth.emailLabel, 'laura@asociacion.org')
    await click(copy.resend.submit)
    expect(await screen.findByText(copy.resend.sent)).toBeInTheDocument()
  })
})
