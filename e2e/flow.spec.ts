import { expect, test, type Page } from '@playwright/test'
import { ASSOCIATION_ADMIN, ECA_ADMIN, installFakeApi } from './fakeApi'

// Spanish texts come from the app (src/assets/i18n/es.json). The flow is the real division of work:
// the Association verifies a new recycler, then the ECA registers a weighing for them and validates it.

async function signIn(page: Page, person: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(person.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(person.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}

test('the Association verifies a recycler; the ECA weighs for them and validates it', async ({ page }) => {
  const api = await installFakeApi(page)

  // 1. The Association admin verifies the new recycler.
  await signIn(page, ASSOCIATION_ADMIN)
  await expect(page.getByRole('heading', { level: 1, name: /Bienvenido, Aura Asociada/ })).toBeVisible()
  await page.getByRole('link', { name: 'Recicladores' }).click()
  const recyclerRow = page.getByRole('row', { name: /Rita Reciclaje/ })
  await expect(recyclerRow).toContainText('Pendiente')
  await recyclerRow.getByRole('button', { name: 'Validar' }).click()
  await expect(recyclerRow).toContainText('Verificado')
  expect(api.recyclers[0].verification_status).toBe('verified')

  // 2. Someone else signs in on the same computer: the session ends, the ECA admin starts theirs.
  await page.evaluate(() => localStorage.clear())
  await signIn(page, ECA_ADMIN)
  await expect(page.getByRole('heading', { level: 1, name: /Bienvenido, Ana Administradora/ })).toBeVisible()

  // 3. Register a weighing: the recycler is found by typing, the price comes from inventory.
  await page.getByRole('link', { name: 'Pesajes' }).click()
  await page.getByRole('button', { name: 'Nuevo pesaje' }).click()
  const drawer = page.getByRole('presentation').filter({ hasText: 'Registrar pesaje' })
  await drawer.getByRole('combobox', { name: /Reciclador/ }).fill('Rita')
  await page.getByRole('option', { name: /Rita Reciclaje/ }).click()
  await drawer.getByLabel(/Material/).click()
  await page.getByRole('option', { name: 'Plástico' }).click()
  await drawer.getByLabel(/Bodega/).click()
  await page.getByRole('option', { name: 'Bodega Norte' }).click()
  await drawer.getByLabel(/Kilogramos/).fill('12')
  await expect(drawer.getByLabel(/Precio por kg/)).toHaveValue('300')
  await drawer.getByRole('button', { name: 'Registrar pesaje' }).click()

  // 4. It appears as pending; validating it moves it on.
  const weighingRow = page.getByRole('row', { name: /Rita Reciclaje/ })
  await expect(weighingRow).toContainText('Pendiente')
  await weighingRow.getByRole('button', { name: 'Validar' }).click()
  await expect(weighingRow).toContainText('Validado')

  expect(api.weighings).toHaveLength(1)
  expect(api.weighings[0].status).toBe('validated')
})

test('an ECA admin is not offered the verification of recyclers', async ({ page }) => {
  await installFakeApi(page)
  await signIn(page, ECA_ADMIN)
  await page.getByRole('link', { name: 'Recicladores' }).click()
  await expect(page.getByRole('row', { name: /Rita Reciclaje/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Validar' })).toHaveCount(0)
})

test('wrong credentials show an error and keep the user on the login screen', async ({ page }) => {
  await installFakeApi(page)
  await signIn(page, { email: ECA_ADMIN.email, password: 'wrong-password-1' })
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('a signed-out visitor is sent to the login screen from any page', async ({ page }) => {
  await installFakeApi(page)
  await page.goto('/inventario')
  await expect(page).toHaveURL(/\/login$/)
})
