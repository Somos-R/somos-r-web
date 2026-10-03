import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { interpolate, t } from '../lib/i18n'
import { mockAdapter } from '../test/helpers'

// The public application to join Somos R. The fake backend below follows the contract: the emailed link's
// token travels in X-Application-Token, only a draft or a "changes requested" application can be edited, what
// is missing decides whether it can be sent, and it can be sent a limited number of times.

const REQUIRED = [
  'legal_name', 'tax_id', 'legal_representative', 'contact_email', 'contact_phone', 'address', 'city',
  'applicant_id_type', 'applicant_id_number', 'applicant_phone',
]
// The three that the applicant (the future first administrator) fills in about themselves.
const APPLICANT_ID = { applicant_id_type: 'CC', applicant_id_number: '1020304050', applicant_phone: '3001234567' }
const TOKEN = 'good-token'
const copy = t.solicitud
const fields = copy.form.fields

type Json = Record<string, unknown>
interface Seen { method: string; url: string; headers: Json; body?: Json }

let seen: Seen[]
let app: Json
let startFailure: { status: number; code: string } | null
let patchFailure: { status: number; code: string } | null
let uploadFailure: { status: number; code: string } | null

interface Slot { code: string; label: string; required: boolean; document: Json | null }
// The documents Somos R asks for: a catalog the server owns, so the page must draw whatever comes.
let slots: Slot[]
const DOCUMENT_SLOTS = (): Slot[] => [
  { code: 'assoc_rut', label: 'RUT', required: true, document: null },
  { code: 'assoc_legal_representative_id', label: 'Cédula del representante legal', required: true, document: null },
  { code: 'assoc_chamber', label: 'Certificado de la cámara de comercio', required: false, document: null },
]

const base = (over: Json = {}): Json => ({
  id: 'org1', type: 'association', status: 'draft', legal_name: 'Asociación Esperanza', tax_id: null,
  legal_representative: null, contact_email: null, contact_phone: null, address: null, city: null,
  applicant_name: 'Laura Gómez', applicant_email: 'laura@asociacion.org', applicant_id_type: null, applicant_id_number: null,
  applicant_phone: null, consent_at: '2026-10-01T00:00:00Z', submitted_at: null, submission_count: 0, feedback: null, ...over,
})

/** What the backend adds: what is missing, whether it can be edited and whether it can be sent. */
function view(): Json {
  const missing = [
    ...REQUIRED.filter((f) => !app[f]),
    ...slots.filter((s) => s.required && !s.document).map((s) => `documents:${s.code}`),
  ]
  const canEdit = app.status === 'draft' || app.status === 'changes_requested'
  const left = Math.max(3 - (app.submission_count as number), 0)
  return { ...app, submissions_left: left, can_edit: canEdit, can_submit: canEdit && missing.length === 0 && left > 0, missing_fields: missing }
}

function serveApplications() {
  seen = []
  startFailure = null
  patchFailure = null
  uploadFailure = null
  slots = []
  app = base()
  apiClient.defaults.adapter = mockAdapter((c) => {
    const method = String(c.method).toUpperCase()
    const url = String(c.url)
    const headers = (c.headers ?? {}) as unknown as Json
    // A file upload is multipart: the test reads the file, everything else is JSON.
    const body = c.data instanceof FormData ? ({ file: c.data.get('file') } as Json) : c.data ? (JSON.parse(String(c.data)) as Json) : undefined
    seen.push({ method, url, headers, body })

    if (method === 'POST' && url === '/applications') {
      if (startFailure) return { status: startFailure.status, data: { detail: 'x', code: startFailure.code } }
      return { status: 202, data: { message: 'enviado' } }
    }
    if (method === 'POST' && url === '/applications/access-link') return { status: 202, data: { message: 'enviado' } }
    if (url === '/catalogs/document-types') return { data: [{ code: 'CC', label: 'Cédula de Ciudadanía' }, { code: 'CE', label: 'Cédula de Extranjería' }] }

    if (headers['X-Application-Token'] !== TOKEN) return { status: 401, data: { detail: 'x', code: 'invalid_application_link' } }
    if (method === 'GET' && url === '/applications/current') return { data: view() }
    if (method === 'GET' && url === '/applications/current/documents') {
      return { data: slots.map((s) => ({ document_type: { code: s.code, label: s.label, is_required: s.required }, document: s.document })) }
    }
    const documentRoute = /^\/applications\/current\/documents\/([^/]+)$/.exec(url)
    if (documentRoute) {
      const slot = slots.find((s) => s.code === documentRoute[1])
      if (!slot) return { status: 404, data: { detail: 'x', code: 'document_type_not_found' } }
      if (!view().can_edit) return { status: 409, data: { detail: 'x', code: 'application_locked' } }
      if (method === 'PUT') {
        if (uploadFailure) return { status: uploadFailure.status, data: { detail: 'x', code: uploadFailure.code } }
        const file = (body as { file: File }).file
        slot.document = {
          id: `doc-${slot.code}`, original_name: file.name, content_type: file.type, size_bytes: file.size,
          uploaded_at: '2026-10-03T00:00:00Z', status: 'pending', review_comment: null,
        }
        return { data: slot.document }
      }
      if (method === 'DELETE') {
        if (!slot.document) return { status: 404, data: { detail: 'x', code: 'document_not_found' } }
        slot.document = null
        return { status: 204, data: undefined }
      }
    }
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
    expect(screen.getAllByText(copy.form.missingHint)).toHaveLength(8) // tax id, representative, email, phone, address + the applicant's document type, number and phone
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
    app = base({ ...APPLICANT_ID, tax_id: '9001', legal_representative: 'Laura Gómez', contact_email: 'a@b.co', contact_phone: '3001234567', address: 'Calle 1' })
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
      ...APPLICANT_ID, status: 'changes_requested', tax_id: '9001', legal_representative: 'L', contact_email: 'a@b.co',
      contact_phone: '300', address: 'Calle 1', city: 'Cali', submission_count: 1,
      feedback: { summary: 'Falta el NIT correcto.\nRevisa la dirección.', created_at: '2026-10-02T00:00:00Z', submission_number: 1, documents: [] },
    })
    await open()
    expect(screen.getByText(copy.status.changes_requested)).toBeInTheDocument()
    // The reviewer's reason is shown above the form, as text.
    expect(screen.getByRole('heading', { name: copy.form.feedbackTitle })).toBeInTheDocument()
    expect(screen.getByText(/Falta el NIT correcto\./)).toBeInTheDocument()
    expect(screen.getByLabelText(fields.legal_name)).toBeEnabled()
    expect(screen.getByText(copy.form.submissionsLeft.replace('{{count}}', '2'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.form.submit })).toBeEnabled()
  })

  it('asks for the applicant\'s own document and phone, and saves them with the same PATCH', async () => {
    await open()
    expect(screen.getByText(copy.form.applicantAdmin)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: fields.applicant_id_type }))
    await userEvent.click(await screen.findByRole('option', { name: 'Cédula de Ciudadanía' }))
    await type(fields.applicant_id_number, '1020304050')
    await type(fields.applicant_phone, '3001234567')
    await click(copy.form.save)

    await screen.findByText(copy.form.saved)
    expect(sentRequests('PATCH', '/applications/current')[0].body).toEqual(APPLICANT_ID)
  })

  it('does not send an applicant document number that is too long', async () => {
    await open()
    await type(fields.applicant_id_number, '1'.repeat(21))
    await click(copy.form.save)
    expect(screen.getByText(copy.form.validation.tooLong.replace('{{max}}', '20'))).toBeInTheDocument()
    expect(sentRequests('PATCH', '/applications/current')).toHaveLength(0)
  })

  it('shows no reviewer feedback when there is none', async () => {
    await open()
    expect(screen.queryByRole('heading', { name: copy.form.feedbackTitle })).not.toBeInTheDocument()
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

describe('application to join Somos R: documents', () => {
  const copy = t.solicitud
  const docs = copy.documents
  const PDF = (name = 'rut.pdf') => new File(['%PDF-1.4 contenido'], name, { type: 'application/pdf' })

  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    serveApplications()
    slots = DOCUMENT_SLOTS()
  })

  const open = async () => {
    renderAt(`/solicitud?token=${TOKEN}`)
    await screen.findByLabelText(copy.form.fields.legal_name)
    await screen.findByText('RUT')
  }
  const uploads = () => sentRequests('PUT', '/applications/current/documents/assoc_rut')
  // The real file input of a document (the visible control is the button next to it).
  const fileInput = (code: string) => screen.getByTestId(`document-file-${code}`)

  it('draws the list the server sends, with what is required and what is not', async () => {
    await open()
    expect(screen.getByRole('heading', { name: docs.title })).toBeInTheDocument()
    expect(screen.getByText('Cédula del representante legal')).toBeInTheDocument()
    expect(screen.getByText('Certificado de la cámara de comercio')).toBeInTheDocument()
    expect(screen.getAllByText(docs.required)).toHaveLength(2)
    expect(screen.getAllByText(docs.optional)).toHaveLength(1)
    expect(screen.getAllByText(docs.none)).toHaveLength(3)
  })

  it('says nothing is asked when the server lists no documents', async () => {
    slots = []
    renderAt(`/solicitud?token=${TOKEN}`)
    expect(await screen.findByText(docs.empty)).toBeInTheDocument()
  })

  it('names a missing required document by its label, and does not let the application be sent', async () => {
    app = base({ ...APPLICANT_ID, tax_id: '9001', legal_representative: 'L', contact_email: 'a@b.co', contact_phone: '300', address: 'Calle 1', city: 'Cali' })
    await open()
    expect(screen.getByText(/Faltan datos para enviar.*RUT.*Cédula del representante legal/)).toBeInTheDocument()
    expect(screen.queryByText(/documents:/)).not.toBeInTheDocument() // never the raw code
    expect(screen.getByRole('button', { name: copy.form.submit })).toBeDisabled()
  })

  it('uploads a file for a document, shows it, and the application can be sent once everything is attached', async () => {
    app = base({ ...APPLICANT_ID, tax_id: '9001', legal_representative: 'L', contact_email: 'a@b.co', contact_phone: '300', address: 'Calle 1', city: 'Cali' })
    await open()
    await userEvent.upload(fileInput('assoc_rut'), PDF())

    expect(await screen.findByText(docs.uploaded)).toBeInTheDocument()
    expect(uploads()).toHaveLength(1)
    expect((uploads()[0].body as { file: File }).file.name).toBe('rut.pdf')
    expect(await screen.findByText(/rut\.pdf/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Faltan datos para enviar/).textContent).not.toMatch(/RUT/))
    expect(screen.getByRole('button', { name: copy.form.submit })).toBeDisabled() // the identity document is still missing

    await userEvent.upload(fileInput('assoc_legal_representative_id'), PDF('cedula.pdf'))
    await waitFor(() => expect(screen.getByRole('button', { name: copy.form.submit })).toBeEnabled())
  })

  it('refuses a file that is empty, too big or of another kind, before uploading anything', async () => {
    await open()
    const input = fileInput('assoc_rut')

    await userEvent.upload(input, new File([], 'vacio.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText(docs.validation.empty)).toBeInTheDocument()

    await userEvent.upload(input, new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText(docs.validation.tooLarge.replace('{{max}}', '5'))).toBeInTheDocument()

    await userEvent.upload(input, new File(['GIF89a'], 'animacion.gif', { type: 'image/gif' }), { applyAccept: false })
    expect(await screen.findByText(docs.validation.type)).toBeInTheDocument()

    expect(uploads()).toHaveLength(0)
  })

  it('accepts a PNG and a JPG by their kind', async () => {
    await open()
    await userEvent.upload(fileInput('assoc_rut'), new File(['x'], 'rut.png', { type: 'image/png' }))
    await screen.findByText(/rut\.png/)
    await userEvent.upload(fileInput('assoc_rut'), new File(['x'], 'rut.jpg', { type: 'image/jpeg' }))
    await screen.findByText(/rut\.jpg/)
  })

  it('replaces a file already uploaded, and removes it', async () => {
    await open()
    await userEvent.upload(fileInput('assoc_rut'), PDF('primero.pdf'))
    await screen.findByText(/primero\.pdf/)

    await userEvent.upload(fileInput('assoc_rut'), PDF('segundo.pdf'))
    expect(await screen.findByText(/segundo\.pdf/)).toBeInTheDocument()
    expect(screen.queryByText(/primero\.pdf/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: interpolate(docs.removeFor, { label: 'RUT' }) }))
    expect(await screen.findByText(docs.removed)).toBeInTheDocument()
    expect(sentRequests('DELETE', '/applications/current/documents/assoc_rut')).toHaveLength(1)
    await waitFor(() => expect(screen.getAllByText(docs.none)).toHaveLength(3))
  })

  it('explains the server refusal of a file in Spanish', async () => {
    uploadFailure = { status: 415, code: 'unsupported_file_type' }
    await open()
    await userEvent.upload(fileInput('assoc_rut'), PDF())
    expect(await screen.findByText(t.apiErrors.unsupported_file_type)).toBeInTheDocument()
  })

  it('shows the reviewer verdict and comment of each document when the application comes back with corrections', async () => {
    app = base({ status: 'changes_requested', submission_count: 1 })
    slots[0].document = {
      id: 'd1', original_name: 'rut.pdf', content_type: 'application/pdf', size_bytes: 2048, uploaded_at: '2026-10-02T00:00:00Z',
      status: 'not_compliant', review_comment: 'Está vencido.',
    }
    slots[1].document = {
      id: 'd2', original_name: 'cedula.pdf', content_type: 'application/pdf', size_bytes: 1024, uploaded_at: '2026-10-02T00:00:00Z',
      status: 'ok', review_comment: null,
    }
    await open()
    expect(screen.getByText(docs.status.not_compliant)).toBeInTheDocument()
    expect(screen.getByText(`${docs.reviewerComment}: Está vencido.`)).toBeInTheDocument()
    expect(screen.getByText(docs.status.ok)).toBeInTheDocument()
    expect(screen.getByText(/2 KB/)).toBeInTheDocument()
    // Uploaded but not looked at yet carries no verdict.
    expect(screen.queryByText(docs.status.pending)).not.toBeInTheDocument()
  })

  it('is read-only once the application is sent: the files are listed but nothing can be changed', async () => {
    app = base({ status: 'submitted' })
    slots[0].document = {
      id: 'd1', original_name: 'rut.pdf', content_type: 'application/pdf', size_bytes: 2048, uploaded_at: '2026-10-02T00:00:00Z',
      status: 'pending', review_comment: null,
    }
    await open()
    expect(screen.getByText(/rut\.pdf/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: interpolate(docs.replaceFor, { label: 'RUT' }) })).not.toBeInTheDocument()
    expect(screen.queryByTestId('document-file-assoc_rut')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: interpolate(docs.removeFor, { label: 'RUT' }) })).not.toBeInTheDocument()
  })

  it('lists the documents the reviewer sent back, with the reason, even with no general text', async () => {
    app = base({
      status: 'changes_requested', submission_count: 1,
      feedback: {
        summary: null, created_at: '2026-10-02T00:00:00Z', submission_number: 1,
        documents: [
          { code: 'assoc_rut', label: 'RUT', status: 'not_compliant', comment: 'Está vencido.' },
          { code: 'assoc_legal_representative_id', label: 'Cédula del representante legal', status: 'missing', comment: null },
        ],
      },
    })
    slots = DOCUMENT_SLOTS()
    await open()
    const box = screen.getByRole('heading', { name: copy.form.feedbackTitle }).closest('[role="alert"]') as HTMLElement
    expect(within(box).getByText(/RUT/)).toBeInTheDocument()
    expect(within(box).getByText(/No cumple · Está vencido\./)).toBeInTheDocument()
    expect(within(box).getByText(/Cédula del representante legal/)).toBeInTheDocument()
    expect(within(box).getByText(new RegExp(`: ${docs.status.missing}$`))).toBeInTheDocument()
  })

  it('does not draw an empty box when the reviewer left corrections with no text', async () => {
    app = base({ status: 'changes_requested', feedback: { summary: null, created_at: '2026-10-02T00:00:00Z', submission_number: 1, documents: [] } })
    await open()
    expect(screen.getByText(copy.status.changes_requested)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: copy.form.feedbackTitle })).not.toBeInTheDocument()
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
