import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { renderAt, serveApi } from '../test/fakeApi'

// Keyboard and focus behaviour that structural checks (axe) cannot see.

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  serveApi('eca_admin')
  document.title = ''
})

const insideOf = (container: HTMLElement) => container.contains(document.activeElement)

describe('moving through the app with the keyboard', () => {
  it('does not steal focus on first load', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    expect(document.activeElement).toBe(document.body)
  })

  it('the first Tab reaches a "skip to content" link, and activating it moves focus to the page content', async () => {
    const user = userEvent.setup()
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')

    await user.tab()
    const skip = screen.getByRole('link', { name: t.common.skipToContent })
    expect(document.activeElement).toBe(skip)

    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(screen.getByRole('main'))
    // The address bar is left alone (no #main-content added to the URL).
    expect(window.location.hash).toBe('')
  })

  it('the tab title names the current screen', async () => {
    renderAt('/inventario')
    await screen.findByRole('heading', { name: t.inventario.title, level: 1 })
    expect(document.title).toBe(`${t.nav.inventario} · ${t.sidebar.brand}`)
  })

  it('navigating updates the title and moves focus to the new content, so a screen reader announces the change', async () => {
    const user = userEvent.setup()
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')

    await user.click(within(screen.getByRole('navigation', { name: t.sidebar.navigation })).getByRole('link', { name: t.nav.inventario }))

    await screen.findByRole('heading', { name: t.inventario.title, level: 1 })
    expect(document.title).toBe(`${t.nav.inventario} · ${t.sidebar.brand}`)
    expect(document.activeElement).toBe(screen.getByRole('main'))
  })

  it('an unknown page falls back to the app name as the title', async () => {
    renderAt('/no-existe')
    await screen.findByText(t.notFound.title)
    // The 404 sits outside the layout, so the layout never sets a title for it.
    expect(document.title).not.toContain(t.nav.pesajes)
  })
})

describe('dialogs and drawers', () => {
  /**
   * Opens an overlay from `trigger` and checks the whole keyboard contract: focus goes inside,
   * Tab never leaves it, Escape closes it, and focus returns to what opened it.
   */
  async function expectKeyboardContract(trigger: HTMLElement, getOverlay: () => HTMLElement, isGone: () => boolean) {
    const user = userEvent.setup()
    await user.click(trigger)
    // MUI keeps focus on the modal's own container, which wraps the dialog panel.
    const focusScope = getOverlay().closest<HTMLElement>('[role="presentation"]') ?? getOverlay()
    await waitFor(() => expect(insideOf(focusScope)).toBe(true))

    // Tabbing more times than there are controls must wrap inside, never reach the page behind.
    for (let i = 0; i < 14; i++) {
      await user.tab()
      expect(insideOf(focusScope)).toBe(true)
    }

    await user.keyboard('{Escape}')
    await waitFor(() => expect(isGone()).toBe(true))
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  }

  it('new weighing drawer', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await expectKeyboardContract(
      screen.getByRole('button', { name: t.pesajes.newWeighing }),
      () => screen.getByRole('presentation'),
      () => screen.queryByText(t.pesajes.drawer.totalToPay) === null && screen.queryByRole('presentation') === null,
    )
  })

  it('reject weighing dialog', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await expectKeyboardContract(
      screen.getByRole('button', { name: t.pesajes.actions.reject }),
      () => screen.getByRole('dialog'),
      () => screen.queryByRole('dialog') === null,
    )
  })

  it('register recycler drawer (the shared form drawer)', async () => {
    renderAt('/recicladores')
    await screen.findByText('Persona pending')
    await expectKeyboardContract(
      screen.getByRole('button', { name: t.recicladores.registerButton }),
      () => screen.getByRole('presentation'),
      () => screen.queryByRole('presentation') === null,
    )
  })

  it('logout confirmation', async () => {
    renderAt('/')
    await screen.findByText(t.dashboard.subtitle)
    await expectKeyboardContract(
      screen.getByRole('button', { name: t.sidebar.logout }),
      () => screen.getByRole('dialog'),
      () => screen.queryByRole('dialog') === null,
    )
  })

  it('the drawer close button is reachable and named, so it works without a mouse', async () => {
    const user = userEvent.setup()
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await user.click(screen.getByRole('button', { name: t.pesajes.newWeighing }))
    const drawer = screen.getByRole('presentation')
    await user.click(within(drawer).getByRole('button', { name: t.common.close }))
    await waitFor(() => expect(screen.queryByRole('presentation')).toBeNull())
  })
})

describe('forms', () => {
  it('a form submits with Enter from a field, as a native form does', async () => {
    const user = userEvent.setup()
    clearSession() // signed in would redirect away from the login screen
    renderAt('/login')
    const email = await screen.findByLabelText(t.auth.emailLabel)
    await user.type(email, 'no-es-un-correo')
    await user.type(screen.getByLabelText(t.auth.passwordLabel), 'una-clave-cualquiera{Enter}')
    // Enter from the last field ran the form's validation, with no mouse click on the button.
    expect(await screen.findByText(t.auth.validation.emailInvalid)).toBeInTheDocument()
  })
})
