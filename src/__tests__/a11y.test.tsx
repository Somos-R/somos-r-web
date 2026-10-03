import { beforeEach, describe, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'
import { renderAt, serveApi } from '../test/fakeApi'
import { apiClient } from '../lib/apiClient'
import { mockAdapter } from '../test/helpers'

// Accessibility of every screen and overlay, checked with axe-core on the rendered DOM. The API is a
// small fake with one row of each kind (pending / validated / rejected...) so every control shows up.

const click = (element: HTMLElement) => userEvent.click(element)

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
})

describe('accessibility: public screens', () => {
  it('login', async () => {
    renderAt('/login')
    await screen.findByRole('button', { name: t.auth.loginButton })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('forgot password', async () => {
    renderAt('/forgot-password')
    await screen.findByRole('button', { name: t.account.forgot.submit })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('activate account (form)', async () => {
    renderAt('/activate?token=abc')
    await screen.findByRole('button', { name: t.account.activate.submit })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('invalid link', async () => {
    renderAt('/reset-password')
    await screen.findByText(t.account.invalidLink.title)
    await expectNoA11yViolations(document.body, { fullPage: true })
  })
})

describe('accessibility: application to join Somos R', () => {
  const application = (over: Record<string, unknown> = {}) => ({
    id: 'org1', type: 'association', status: 'draft', legal_name: 'Asociación Esperanza', tax_id: '9001',
    legal_representative: 'Laura Gómez', contact_email: 'a@b.co', contact_phone: '300', address: 'Calle 1', city: 'Cali',
    applicant_name: 'Laura Gómez', applicant_email: 'laura@asociacion.org', applicant_id_type: 'CC', applicant_id_number: '1020',
    applicant_phone: '300', consent_at: '2026-10-01T00:00:00Z', submitted_at: null, submission_count: 0, submissions_left: 3,
    can_edit: true, can_submit: true, missing_fields: [], feedback: null, ...over,
  })
  // What the server asks for: one document not uploaded yet, one with the reviewer's verdict.
  let slots: unknown[] = []
  const withDocuments = () => {
    slots = [
      { document_type: { code: 'assoc_rut', label: 'RUT', is_required: true }, document: null },
      {
        document_type: { code: 'assoc_id', label: 'Cédula del representante legal', is_required: true },
        document: { id: 'd', original_name: 'cedula.pdf', content_type: 'application/pdf', size_bytes: 2048, uploaded_at: '2026-10-02T00:00:00Z', status: 'not_compliant', review_comment: 'Está borrosa.' },
      },
    ]
  }
  beforeEach(() => { slots = [] })
  const serve = (view: Record<string, unknown>) => {
    apiClient.defaults.adapter = mockAdapter((c) => ({
      data:
        c.url === '/catalogs/document-types' ? [{ code: 'CC', label: 'Cédula de Ciudadanía' }]
        : c.url === '/applications/current/documents' ? slots
        : view,
    }))
  }

  it('start', async () => {
    renderAt('/solicitud')
    await screen.findByRole('button', { name: t.solicitud.start.submit })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('ask for a new link', async () => {
    renderAt('/solicitud')
    await click(await screen.findByRole('button', { name: t.solicitud.start.haveOne }))
    await screen.findByRole('button', { name: t.solicitud.resend.submit })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('invalid link', async () => {
    apiClient.defaults.adapter = mockAdapter(() => ({ status: 401, data: { detail: 'x', code: 'invalid_application_link' } }))
    renderAt('/solicitud?token=wrong')
    await screen.findByRole('heading', { name: t.solicitud.invalidLink.title })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('form with missing data', async () => {
    serve(application({ city: null, can_submit: false, missing_fields: ['city'] }))
    renderAt('/solicitud?token=abc')
    await screen.findByLabelText(t.solicitud.form.fields.legal_name)
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('form with the reviewer\'s corrections', async () => {
    serve(application({
      status: 'changes_requested', submission_count: 1, submissions_left: 2,
      feedback: { summary: 'Falta el NIT correcto.', created_at: '2026-10-02T00:00:00Z', submission_number: 1 },
    }))
    renderAt('/solicitud?token=abc')
    await screen.findByRole('heading', { name: t.solicitud.form.feedbackTitle })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('form with documents to upload and a reviewer verdict', async () => {
    withDocuments()
    serve(application({ status: 'changes_requested', submission_count: 1, submissions_left: 2, can_submit: false, missing_fields: ['documents:assoc_rut'] }))
    renderAt('/solicitud?token=abc')
    await screen.findByRole('heading', { name: t.solicitud.documents.title })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('read-only form with documents', async () => {
    withDocuments()
    serve(application({ status: 'submitted', can_edit: false, can_submit: false, submission_count: 1, submissions_left: 2 }))
    renderAt('/solicitud?token=abc')
    await screen.findByRole('heading', { name: t.solicitud.documents.title })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('read-only form', async () => {
    serve(application({ status: 'submitted', can_edit: false, can_submit: false, submission_count: 1, submissions_left: 2 }))
    renderAt('/solicitud?token=abc')
    await screen.findByText(t.solicitud.status.submitted)
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('confirm sending', async () => {
    serve(application())
    renderAt('/solicitud?token=abc')
    await click(await screen.findByRole('button', { name: t.solicitud.form.submit }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })
})

describe('accessibility: screens (ECA admin)', () => {
  beforeEach(() => serveApi('eca_admin'))

  it('dashboard', async () => {
    renderAt('/')
    await screen.findByText(t.dashboard.subtitle)
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('weighings', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('inventory', async () => {
    renderAt('/inventario')
    await screen.findAllByText('Bodega Norte')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('transactions: purchases and sales', async () => {
    renderAt('/transacciones')
    await screen.findByRole('tab', { name: new RegExp(t.transacciones.tabs.sales) })
    await expectNoA11yViolations(document.body, { fullPage: true })
    await click(screen.getByRole('tab', { name: new RegExp(t.transacciones.tabs.sales) }))
    await screen.findAllByText('Ecoplas SAS')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('settings', async () => {
    renderAt('/configuracion')
    await screen.findByRole('button', { name: t.account.security.changePassword.button })
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('page not found', async () => {
    renderAt('/no-existe')
    await screen.findByText(t.notFound.title)
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('recyclers (ECA admin: register only)', async () => {
    renderAt('/recicladores')
    await screen.findByText('Persona pending')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })
})

describe('accessibility: staff (ECA admin)', () => {
  beforeEach(() => serveApi('eca_admin'))

  it('staff', async () => {
    renderAt('/personal')
    await screen.findByText('Pedro Pendiente')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })

  it('invite staff drawer', async () => {
    renderAt('/personal')
    await click(await screen.findByRole('button', { name: t.personal.inviteButton }))
    await waitFor(() => screen.getByRole('presentation'))
    await expectNoA11yViolations(document.body)
  })
})

describe('accessibility: recyclers with verification actions (association admin)', () => {
  it('recyclers', async () => {
    serveApi('association_admin')
    renderAt('/recicladores')
    await screen.findByText('Persona pending')
    await expectNoA11yViolations(document.body, { fullPage: true })
  })
})

describe('accessibility: dialogs and drawers', () => {
  beforeEach(() => serveApi('eca_admin'))

  it('new weighing drawer', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await click(screen.getByRole('button', { name: t.pesajes.newWeighing }))
    await screen.findByText(t.pesajes.drawer.totalToPay, {}, { timeout: 100 }).catch(() => undefined)
    await screen.findByRole('presentation')
    await expectNoA11yViolations()
  })

  it('reject weighing dialog', async () => {
    renderAt('/pesajes')
    await click(await screen.findByRole('button', { name: t.pesajes.actions.reject }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })

  it('edit inventory dialog', async () => {
    renderAt('/inventario')
    await screen.findAllByText('Bodega Norte')
    await click(screen.getAllByRole('button', { name: t.inventario.editTooltip })[0])
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })

  it('new sale dialog', async () => {
    renderAt('/transacciones')
    await click(await screen.findByRole('tab', { name: new RegExp(t.transacciones.tabs.sales) }))
    await click(await screen.findByRole('button', { name: t.transacciones.newSale }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })

  it('cancel sale dialog', async () => {
    renderAt('/transacciones')
    await click(await screen.findByRole('tab', { name: new RegExp(t.transacciones.tabs.sales) }))
    await click(await screen.findByRole('button', { name: t.transacciones.actions.cancel }))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })

  it('register recycler drawer', async () => {
    renderAt('/recicladores')
    await screen.findByText('Persona pending')
    await click(screen.getByRole('button', { name: t.recicladores.registerButton }))
    await waitFor(() => screen.getByRole('presentation'))
    await expectNoA11yViolations()
  })

  it('change password drawer', async () => {
    renderAt('/configuracion')
    await click(await screen.findByRole('button', { name: t.account.security.changePassword.button }))
    await waitFor(() => screen.getByRole('presentation'))
    await expectNoA11yViolations()
  })

  it('logout confirmation', async () => {
    renderAt('/')
    await screen.findByText(t.dashboard.subtitle)
    await click(screen.getByTitle(t.sidebar.logout))
    await screen.findByRole('dialog')
    await expectNoA11yViolations()
  })
})
