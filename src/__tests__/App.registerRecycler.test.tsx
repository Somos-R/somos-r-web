import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosAdapter } from 'axios'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { httpError } from '../test/helpers'
import { renderAt, serveApi } from '../test/fakeApi'

// Registering a recycler: the recycler belongs to the association that verifies them. Association staff
// register into their own (the backend knows it); anyone else must choose one, or the backend answers
// 422 `association_required`.

const fields = t.recicladores.register.fields
let registerBodies: Record<string, unknown>[]
let associationRequests: number
let registerFailure: { status: number; code: string } | null

function serveWithRegister(role: 'eca_admin' | 'association_admin') {
  serveApi(role)
  const base = apiClient.defaults.adapter as AxiosAdapter
  registerBodies = []
  associationRequests = 0
  registerFailure = null
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/catalogs/associations') associationRequests += 1
    if (config.url === '/auth/register') {
      registerBodies.push(JSON.parse(String(config.data)))
      if (registerFailure) throw httpError(config, registerFailure.status, { detail: 'x', code: registerFailure.code })
      return { status: 201, data: {}, statusText: 'Created', headers: {}, config }
    }
    return base(config)
  }
}

async function openDrawer() {
  renderAt('/recicladores')
  await userEvent.click(await screen.findByRole('button', { name: t.recicladores.registerButton }))
  await screen.findByLabelText(new RegExp(fields.fullName))
}

async function fillPerson() {
  await userEvent.type(screen.getByLabelText(new RegExp(fields.fullName)), 'Nuevo Reciclador')
  await userEvent.type(screen.getByLabelText(new RegExp(fields.email)), 'nuevo@x.co')
  await userEvent.click(screen.getByRole('combobox', { name: new RegExp(fields.documentType) }))
  await userEvent.click(await screen.findByRole('option', { name: 'Cédula de Ciudadanía' }))
  await userEvent.type(screen.getByLabelText(new RegExp(fields.documentNumber)), '1020304050')
}

describe('register a recycler: which association', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
  })

  it('an ECA must choose the association, and it is sent with the registration', async () => {
    serveWithRegister('eca_admin')
    await openDrawer()
    await fillPerson()

    const submit = screen.getByRole('button', { name: t.recicladores.register.submitLabel })
    expect(submit).toBeDisabled() // the association is required

    await userEvent.click(screen.getByRole('combobox', { name: new RegExp(fields.association) }))
    expect(await screen.findByRole('option', { name: 'Asociación Dos' })).toBeInTheDocument() // no city: just the name
    await userEvent.click(screen.getByRole('option', { name: 'Asociación Uno · Bogotá' }))
    await userEvent.click(submit)

    await waitFor(() => expect(registerBodies).toHaveLength(1))
    expect(registerBodies[0]).toMatchObject({ user_type_code: 'recycler', id_number: '1020304050', association_id: 'a1' })
  })

  it('association staff are not asked: the backend uses their own association', async () => {
    serveWithRegister('association_admin')
    await openDrawer()
    expect(screen.queryByRole('combobox', { name: new RegExp(fields.association) })).not.toBeInTheDocument()
    await fillPerson()
    await userEvent.click(screen.getByRole('button', { name: t.recicladores.register.submitLabel }))

    await waitFor(() => expect(registerBodies).toHaveLength(1))
    expect(registerBodies[0]).not.toHaveProperty('association_id')
    expect(associationRequests).toBe(0)
  })

  it('does not ask for the associations until the drawer opens', async () => {
    serveWithRegister('eca_admin')
    renderAt('/recicladores')
    await screen.findByRole('button', { name: t.recicladores.registerButton })
    expect(associationRequests).toBe(0)
  })

  it('shows the backend refusal in Spanish when the association is no longer valid', async () => {
    serveWithRegister('eca_admin')
    registerFailure = { status: 422, code: 'invalid_association' }
    await openDrawer()
    await fillPerson()
    await userEvent.click(screen.getByRole('combobox', { name: new RegExp(fields.association) }))
    await userEvent.click(await screen.findByRole('option', { name: 'Asociación Uno · Bogotá' }))
    await userEvent.click(screen.getByRole('button', { name: t.recicladores.register.submitLabel }))

    expect(await screen.findByText(t.apiErrors.invalid_association)).toBeInTheDocument()
  })
})
