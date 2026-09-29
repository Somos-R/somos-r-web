import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { t } from '../lib/i18n'
import { clearSession, setTokens } from '../lib/session'
import { fakeJwt, mockAdapter } from '../test/helpers'
import { capabilitiesForRole } from '../test/capabilities'
import type { InternalAxiosRequestConfig } from 'axios'

// Errors as the user meets them: an action fails on the server and they must be told why, with
// the screen reloaded to what is true now.

const WAREHOUSE = { id: 'b1', name: 'Bodega Norte', address: null }
const MATERIAL = { code: 'plastic', label: 'Plástico', unit: 'kg' }

const weighing = (status: string) => ({
  id: 'w1', recycler_id: 'r1', recycler: { id: 'r1', full_name: 'Rita Reciclaje', id_number: '1' },
  material_code: 'plastic', material: MATERIAL, warehouse_id: 'b1', warehouse: WAREHOUSE,
  kg: 10, price_per_kg: 500, status, rejection_reason: null, validated_by: null, validated_at: null,
  occurred_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', total_value: 5000,
})

const sale = {
  id: 't1', type: 'sale', status: 'pending', material_code: 'plastic', warehouse_id: 'b1', kg: 8,
  price_per_kg: 250, total_value: 2000, recycler_id: null, recycler: null, weighing_id: null, buyer_name: 'Ecoplas',
  buyer_nit: null, buyer_email: null, occurred_at: '2026-01-03T00:00:00Z', created_at: '2026-01-03T00:00:00Z',
  material: MATERIAL, warehouse: WAREHOUSE,
}

type Handler = (c: InternalAxiosRequestConfig) => { status?: number; data?: unknown } | undefined

let calls: string[]

function serveApi(extra: Handler = () => undefined) {
  calls = []
  setTokens({ access_token: fakeJwt({ sub: 'me' }), refresh_token: 'r' })
  apiClient.defaults.adapter = mockAdapter((c) => {
    const url = String(c.url)
    calls.push(`${String(c.method).toUpperCase()} ${url}`)
    const override = extra(c)
    if (override) return override
    if (url === '/auth/me') {
      return {
        data: {
          id: 'me', email: 'me@x.co', full_name: 'Admin ECA', phone: null, id_type: 'CC', id_number: '9',
          user_type_code: 'eca', role_code: 'eca_admin', capabilities: capabilitiesForRole('eca_admin'), is_active: true,
          email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
        },
      }
    }
    if (url === '/weighings') return { data: { total: 1, items: [weighing('pending_validation')] } }
    if (url === '/weighings/stats') return { data: { total_weighings_month: 1, total_kg_month: 10, pending_count: 1, by_material: [] } }
    if (url === '/inventory') return { data: { total: 0, items: [] } }
    if (url === '/inventory/stats') return { data: { total_stock_kg: 0, total_value: 0, available_count: 0, low_stock_count: 0, out_of_stock_count: 0 } }
    if (url === '/transactions') return { data: { total: 1, items: c.params?.type === 'sale' ? [sale] : [] } }
    if (url === '/transactions/stats') {
      return { data: { total_purchases_month: 0, total_sales_month: 1, total_kg_purchases: 0, total_kg_sales: 8, total_value_purchases: 0, total_value_sales: 2000, pending_count: 1 } }
    }
    if (url.startsWith('/inventory/') || url.startsWith('/catalogs')) return { data: [] }
    return { data: { total: 0, items: [] } }
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

const count = (needle: string) => calls.filter((c) => c === needle).length

describe('errors shown to the user', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
  })

  it('validating a weighing whose recycler is no longer verified shows the server message and reloads the list', async () => {
    serveApi((c) =>
      c.method === 'patch' && String(c.url) === '/weighings/w1/status'
        ? { status: 400, data: { detail: 'El reciclador no está verificado o su cuenta está desactivada' } }
        : undefined,
    )
    renderAt('/pesajes')
    await userEvent.click(await screen.findByRole('button', { name: /Validar/ }))

    expect(await screen.findByText('El reciclador no está verificado o su cuenta está desactivada')).toBeInTheDocument()
    // The row is reloaded so the user sees what the server now says, not what they clicked on.
    await waitFor(() => expect(count('GET /weighings')).toBeGreaterThanOrEqual(2))
  })

  it('shows the translated message for the backend error code, not its wording', async () => {
    serveApi((c) =>
      c.method === 'patch' && String(c.url) === '/weighings/w1/status'
        ? { status: 400, data: { detail: 'Texto del backend que puede cambiar', code: 'recycler_not_verified' } }
        : undefined,
    )
    renderAt('/pesajes')
    await userEvent.click(await screen.findByRole('button', { name: /Validar/ }))
    expect(await screen.findByText(t.apiErrors.recycler_not_verified)).toBeInTheDocument()
    expect(screen.queryByText('Texto del backend que puede cambiar')).not.toBeInTheDocument()
  })

  it('a successful validation marks inventory and transactions stale, since it changes both', async () => {
    serveApi((c) => (c.method === 'patch' ? { data: weighing('validated') } : undefined))
    renderAt('/pesajes')
    // Data other screens already hold: validating creates a purchase and adds stock.
    queryClient.setQueryData(['inventory'], { total: 0, items: [] })
    queryClient.setQueryData(['transactions'], { total: 0, items: [] })
    await userEvent.click(await screen.findByRole('button', { name: /Validar/ }))
    await waitFor(() => expect(queryClient.getQueryState(['inventory'])?.isInvalidated).toBe(true))
    expect(queryClient.getQueryState(['transactions'])?.isInvalidated).toBe(true)
  })

  it('cancelling a sale that can no longer be cancelled shows the message and closes the dialog', async () => {
    serveApi((c) =>
      c.method === 'patch' && String(c.url) === '/transactions/t1/status'
        ? { status: 400, data: { detail: "La transacción ya no está en estado 'pending'" } }
        : undefined,
    )
    renderAt('/transacciones')
    await userEvent.click(await screen.findByRole('tab', { name: /Ventas/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar cancelación' }))

    expect(await screen.findByText("La transacción ya no está en estado 'pending'")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Confirmar cancelación')).not.toBeInTheDocument())
    await waitFor(() => expect(count('GET /transactions')).toBeGreaterThan(2))
  })

  it('a screen that fails to load with a server error tells the user (after the retries)', async () => {
    const previous = queryClient.getDefaultOptions()
    queryClient.setDefaultOptions({ ...previous, queries: { ...previous.queries, retryDelay: 0 } })
    serveApi((c) => (String(c.url) === '/inventory' ? { status: 500, data: { detail: 'Internal Server Error' } } : undefined))
    renderAt('/inventario')
    expect(await screen.findByText('Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.')).toBeInTheDocument()
    queryClient.setDefaultOptions(previous)
  })

  it('a 403 on a screen explains it and reloads the profile', async () => {
    serveApi((c) => (String(c.url) === '/inventory' ? { status: 403, data: { detail: 'No tienes permisos para realizar esta acción' } } : undefined))
    renderAt('/inventario')
    expect(await screen.findByText('No tienes permisos para realizar esta acción')).toBeInTheDocument()
    await waitFor(() => expect(calls.filter((c) => c === 'GET /auth/me').length).toBeGreaterThanOrEqual(2))
  })
})
