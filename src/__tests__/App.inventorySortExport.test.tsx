import { beforeEach, describe, expect, it, vi } from 'vitest'
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
import { saveBlob } from '../lib/download'

vi.mock('../lib/download', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/download')>()), saveBlob: vi.fn() }))

// What the inventory screen asks the server when the operator orders the table or downloads the CSV.
// Inventory is a snapshot of the stock now, so there is no period: only order and filters.

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
    if (config.url === '/inventory') listRequests.push((config.params ?? {}) as Params)
    if (config.url === '/inventory/export.csv') {
      exportRequests.push((config.params ?? {}) as Params)
      if (exportFails) throw httpError(config, 400, new Blob([JSON.stringify({ detail: 'x', code: 'export_too_large' })]))
      return { status: 200, data: new Blob(['material,kg\n']), statusText: 'OK', headers: {}, config }
    }
    return base(config)
  }
}

const lastList = () => listRequests.at(-1)
const header = (name: string) => screen.getByRole('columnheader', { name })

describe('inventory: order and CSV', () => {
  beforeEach(() => {
    clearSession()
    queryClient.clear()
    resetNotifier()
    vi.mocked(saveBlob).mockClear()
    serveWithExport()
  })

  it('starts ordered by material, A to Z', async () => {
    renderAt('/inventario')
    await screen.findByRole('columnheader', { name: t.inventario.table.material })
    expect(lastList()).toMatchObject({ sort: 'material', order: 'asc' })
    expect(header(t.inventario.table.material)).toHaveAttribute('aria-sort', 'ascending')
  })

  it('clicking a column orders by it, and clicking it again reverses it', async () => {
    renderAt('/inventario')
    await screen.findByRole('columnheader', { name: t.inventario.table.material })

    await userEvent.click(screen.getByRole('button', { name: t.inventario.table.currentStock }))
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'stock_kg', order: 'asc', offset: 0 }))
    expect(header(t.inventario.table.currentStock)).toHaveAttribute('aria-sort', 'ascending')
    expect(header(t.inventario.table.material)).not.toHaveAttribute('aria-sort')

    await userEvent.click(screen.getByRole('button', { name: t.inventario.table.currentStock }))
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'stock_kg', order: 'desc' }))
  })

  it('the last-updated column starts newest first', async () => {
    renderAt('/inventario')
    await screen.findByRole('columnheader', { name: t.inventario.table.material })
    await userEvent.click(screen.getByRole('button', { name: t.inventario.table.updated }))
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'updated_at', order: 'desc' }))
  })

  it('the minimum column is not sortable', async () => {
    renderAt('/inventario')
    await screen.findByRole('columnheader', { name: t.inventario.table.material })
    expect(screen.queryByRole('button', { name: t.inventario.table.minimum })).not.toBeInTheDocument()
  })

  it('downloads the CSV with the filters and order on screen, and no page', async () => {
    renderAt('/inventario')
    await screen.findByRole('columnheader', { name: t.inventario.table.material })
    await userEvent.click(screen.getByRole('button', { name: t.inventario.table.totalValue }))
    await waitFor(() => expect(lastList()).toMatchObject({ sort: 'total_value' }))

    await userEvent.click(screen.getByRole('button', { name: t.common.exportCsv.button }))

    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1))
    expect(exportRequests[0]).toMatchObject({ sort: 'total_value', order: 'asc' })
    expect(exportRequests[0].limit).toBeUndefined()
    expect(exportRequests[0].offset).toBeUndefined()
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toMatch(/^inventario-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('tells the operator to narrow the report when it is too large, and saves nothing', async () => {
    exportFails = true
    renderAt('/inventario')
    await userEvent.click(await screen.findByRole('button', { name: t.common.exportCsv.button }))
    expect(await screen.findByText(t.apiErrors.export_too_large)).toBeInTheDocument()
    expect(saveBlob).not.toHaveBeenCalled()
  })
})
