import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosAdapter } from 'axios'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { httpError } from '../test/helpers'
import { renderAt, serveApi } from '../test/fakeApi'
import { saveBlob } from '../lib/download'

vi.mock('../lib/download', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/download')>()), saveBlob: vi.fn() }))

// What the transactions screen asks the server when the operator orders a tab, bounds a period or
// downloads the CSV. The server does the ordering and the filtering; the screen only sends the request.

type Params = Record<string, string | number | undefined>
let listRequests: Params[]
let exportRequests: Params[]
let exportFails: boolean

function serveWithExport() {
  serveApi()
  const base = apiClient.defaults.adapter as AxiosAdapter
  listRequests = []
  exportRequests = []
  exportFails = false
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/transactions' && (config.params as Params)?.limit !== 1) listRequests.push((config.params ?? {}) as Params)
    if (config.url === '/transactions/export.csv') {
      exportRequests.push((config.params ?? {}) as Params)
      if (exportFails) throw httpError(config, 400, new Blob([JSON.stringify({ detail: 'x', code: 'export_too_large' })]))
      return { status: 200, data: new Blob(['date,kg\n']), statusText: 'OK', headers: {}, config }
    }
    return base(config)
  }
}

const lastList = (kind: 'purchase' | 'sale') => listRequests.filter((r) => r.type === kind).at(-1)
const header = (name: string) => screen.getByRole('columnheader', { name })

describe('transactions: order, period and CSV', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    vi.mocked(saveBlob).mockClear()
    serveWithExport()
  })

  it('starts newest first, without asking for a period', async () => {
    renderAt('/transacciones')
    await waitFor(() => expect(lastList('purchase')).toMatchObject({ sort: 'occurred_at', order: 'desc' }))
    expect(lastList('purchase')?.date_from).toBeUndefined()
    expect(await screen.findByRole('columnheader', { name: t.transacciones.table.date })).toHaveAttribute('aria-sort', 'descending')
  })

  it('clicking a column orders by it, and clicking it again reverses it', async () => {
    renderAt('/transacciones')
    await screen.findByRole('columnheader', { name: t.transacciones.table.kg })

    await userEvent.click(screen.getByRole('button', { name: t.transacciones.table.kg }))
    await waitFor(() => expect(lastList('purchase')).toMatchObject({ sort: 'kg', order: 'asc', offset: 0 }))
    expect(header(t.transacciones.table.kg)).toHaveAttribute('aria-sort', 'ascending')

    await userEvent.click(screen.getByRole('button', { name: t.transacciones.table.kg }))
    await waitFor(() => expect(lastList('purchase')).toMatchObject({ sort: 'kg', order: 'desc' }))
  })

  it('the sales tab uses the same order and period', async () => {
    renderAt('/transacciones')
    await screen.findByRole('columnheader', { name: t.transacciones.table.kg })
    await userEvent.click(screen.getByRole('button', { name: t.transacciones.table.total }))
    await userEvent.click(screen.getByRole('tab', { name: t.transacciones.tabs.sales }))
    await waitFor(() => expect(lastList('sale')).toMatchObject({ sort: 'total_value', order: 'asc' }))
  })

  it('a period is sent as the instants that bound those days', async () => {
    renderAt('/transacciones')
    await screen.findByLabelText(t.common.period.from)
    fireEvent.change(screen.getByLabelText(t.common.period.from), { target: { value: '2026-03-01' } })
    fireEvent.change(screen.getByLabelText(t.common.period.to), { target: { value: '2026-03-31' } })
    await waitFor(() => expect(lastList('purchase')).toMatchObject({
      date_from: new Date('2026-03-01T00:00:00.000').toISOString(),
      date_to: new Date('2026-03-31T23:59:59.999').toISOString(),
      offset: 0,
    }))
  })

  it('downloads the CSV of the tab on screen with the order and period, and no page', async () => {
    renderAt('/transacciones')
    await screen.findByLabelText(t.common.period.from)
    await userEvent.click(screen.getByRole('button', { name: t.transacciones.table.kg }))
    fireEvent.change(screen.getByLabelText(t.common.period.from), { target: { value: '2026-03-01' } })
    await waitFor(() => expect(lastList('purchase')).toMatchObject({ sort: 'kg', date_from: expect.any(String) }))

    await userEvent.click(screen.getByRole('button', { name: t.common.exportCsv.button }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1))
    expect(exportRequests[0]).toMatchObject({ type: 'purchase', sort: 'kg', order: 'asc', date_from: new Date('2026-03-01T00:00:00.000').toISOString() })
    expect(exportRequests[0].limit).toBeUndefined()
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toMatch(/^compras-\d{4}-\d{2}-\d{2}\.csv$/)

    await userEvent.click(screen.getByRole('tab', { name: t.transacciones.tabs.sales }))
    await userEvent.click(await screen.findByRole('button', { name: t.common.exportCsv.button }))
    await waitFor(() => expect(exportRequests).toHaveLength(2))
    expect(exportRequests[1]).toMatchObject({ type: 'sale' })
    expect(vi.mocked(saveBlob).mock.calls[1][1]).toMatch(/^ventas-/)
  })

  it('tells the operator to narrow the report when it is too large, and saves nothing', async () => {
    exportFails = true
    renderAt('/transacciones')
    await userEvent.click(await screen.findByRole('button', { name: t.common.exportCsv.button }))
    expect(await screen.findByText(t.apiErrors.export_too_large)).toBeInTheDocument()
    expect(saveBlob).not.toHaveBeenCalled()
  })
})
