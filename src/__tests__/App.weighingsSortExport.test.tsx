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

// What the weighings screen asks the server when the operator orders the table, bounds a period or
// downloads the CSV. The server does the ordering and the filtering; the screen only sends the request.

type Params = Record<string, string | number | undefined>
let weighingRequests: Params[]
let exportRequests: Params[]
let exportFails: boolean

function serveWithExport() {
  serveApi()
  const base = apiClient.defaults.adapter as AxiosAdapter
  weighingRequests = []
  exportRequests = []
  exportFails = false
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/weighings') weighingRequests.push((config.params ?? {}) as Params)
    if (config.url === '/weighings/export.csv') {
      exportRequests.push((config.params ?? {}) as Params)
      if (exportFails) {
        const body = new Blob([JSON.stringify({ detail: 'x', code: 'export_too_large' })])
        throw httpError(config, 400, body)
      }
      return { status: 200, data: new Blob(['date,kg\n']), statusText: 'OK', headers: {}, config }
    }
    return base(config)
  }
}

const lastList = () => weighingRequests.at(-1)
const header = (name: string) => screen.getByRole('columnheader', { name })

describe('weighings: order, period and CSV', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    vi.mocked(saveBlob).mockClear()
    serveWithExport()
  })

  it('starts newest first, without asking for a period', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    expect(lastList()).toMatchObject({ sort: 'occurred_at', order: 'desc' })
    expect(lastList()?.date_from).toBeUndefined()
    expect(header(t.pesajes.table.date)).toHaveAttribute('aria-sort', 'descending')
  })

  it('clicking a column orders by it, and clicking it again reverses it', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')

    await userEvent.click(screen.getByRole('button', { name: t.pesajes.table.kg }))
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'kg', order: 'asc', offset: 0 }))
    expect(header(t.pesajes.table.kg)).toHaveAttribute('aria-sort', 'ascending')
    expect(header(t.pesajes.table.date)).not.toHaveAttribute('aria-sort')

    await userEvent.click(screen.getByRole('button', { name: t.pesajes.table.kg }))
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'kg', order: 'desc' }))
    expect(header(t.pesajes.table.kg)).toHaveAttribute('aria-sort', 'descending')
  })

  it('the total column orders by total_value', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await userEvent.click(screen.getByRole('button', { name: t.pesajes.table.total }))
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'total_value', order: 'asc' }))
  })

  it('a period is sent as the instants that bound those days', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')

    fireEvent.change(screen.getByLabelText(t.common.period.from), { target: { value: '2026-03-01' } })
    fireEvent.change(screen.getByLabelText(t.common.period.to), { target: { value: '2026-03-31' } })

    await waitFor(() => expect(lastList()).toMatchObject({
      date_from: new Date('2026-03-01T00:00:00.000').toISOString(),
      date_to: new Date('2026-03-31T23:59:59.999').toISOString(),
      offset: 0,
    }))
  })

  it('warns when the period runs backwards', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    fireEvent.change(screen.getByLabelText(t.common.period.from), { target: { value: '2026-03-10' } })
    fireEvent.change(screen.getByLabelText(t.common.period.to), { target: { value: '2026-03-01' } })
    expect(await screen.findByText(t.common.period.backwards)).toBeInTheDocument()
  })

  it('downloads the CSV with the filters and order on screen, and no page', async () => {
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await userEvent.click(screen.getByRole('button', { name: t.pesajes.table.kg }))
    fireEvent.change(screen.getByLabelText(t.common.period.from), { target: { value: '2026-03-01' } })
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'kg', date_from: expect.any(String) }))

    await userEvent.click(screen.getByRole('button', { name: t.common.exportCsv.button }))

    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1))
    expect(exportRequests[0]).toMatchObject({ sort: 'kg', order: 'asc', date_from: new Date('2026-03-01T00:00:00.000').toISOString() })
    expect(exportRequests[0].limit).toBeUndefined()
    expect(exportRequests[0].offset).toBeUndefined()
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toMatch(/^pesajes-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('tells the operator to narrow the report when it is too large, and saves nothing', async () => {
    exportFails = true
    renderAt('/pesajes')
    await screen.findByText('Rita Pendiente')
    await userEvent.click(screen.getByRole('button', { name: t.common.exportCsv.button }))
    expect(await screen.findByText(t.apiErrors.export_too_large)).toBeInTheDocument()
    expect(saveBlob).not.toHaveBeenCalled()
  })
})
