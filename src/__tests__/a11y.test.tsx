import { beforeEach, describe, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'
import { renderAt, serveApi } from '../test/fakeApi'

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
