import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { resetNotifier } from '../lib/notifier'
import { clearSession } from '../lib/session'
import { t } from '../lib/i18n'
import { expectNoA11yViolations } from '../test/axe'
import { installFakeCamera, removeCameraApi } from '../test/fakeCamera'
import { mockAdapter } from '../test/helpers'
import { renderAt, serveApi } from '../test/fakeApi'

vi.mock('jsqr', () => ({ default: vi.fn() }))

// Identifying who delivers by scanning their identity QR. The QR carries only a document
// (`somosr:recycler:<type>:<number>`): scanning is the same as typing it, so the lookup, and everything the
// server answers about the person, is the one already covered by the document search.

const qr = t.pesajes.drawer.person.qr
const lookups: Record<string, unknown>[] = []
let lookupReply: { status?: number; data: unknown }

function serve() {
  serveApi('eca_admin')
  const inner = apiClient.defaults.adapter as AxiosAdapter
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (config.url === '/recyclers/lookup') {
      lookups.push((config.params ?? {}) as Record<string, unknown>)
      return mockAdapter(() => lookupReply)(config)
    }
    return inner(config)
  }
}

const openScanner = async () => {
  await screen.findByText('Rita Pendiente')
  await userEvent.click(screen.getByRole('button', { name: t.pesajes.newWeighing }))
  await userEvent.click(await screen.findByRole('button', { name: qr.scanButton }))
  return screen.findByRole('dialog', { name: qr.title })
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
  resetNotifier()
  lookups.length = 0
  lookupReply = {
    data: {
      id: 'r1', full_name: 'Rita Reciclaje', id_type: 'CC', id_number: '1001', is_active: true, verification_status: 'verified',
      association: { id: 'a1', legal_name: 'Asociación Uno', city: 'Bogotá' }, affiliation: 'linked',
    },
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('identify the recycler by QR', () => {
  it('looks the person up by the document in the QR, shows who they are and releases the camera', async () => {
    const camera = installFakeCamera()
    serve()
    renderAt('/pesajes')
    await openScanner()
    expect(camera.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false })

    camera.seeQr('somosr:recycler:CC:1001')

    const person = await screen.findByRole('region', { name: t.pesajes.drawer.who })
    expect(within(person).getByText('Rita Reciclaje')).toBeInTheDocument()
    expect(within(person).getByText(t.pesajes.affiliation.linked)).toBeInTheDocument()
    expect(lookups).toEqual([{ document: '1001', id_type: 'CC' }]) // the same request as typing the document
    expect(screen.queryByRole('dialog', { name: qr.title })).not.toBeInTheDocument()
    expect(camera.stopTrack).toHaveBeenCalled()
  })

  it('keeps scanning when the QR is not a Somos R identity, and accepts the right one afterwards', async () => {
    const camera = installFakeCamera()
    serve()
    renderAt('/pesajes')
    await openScanner()

    camera.seeQr('https://example.com/pago?id=1')
    expect(await screen.findByText(qr.invalid)).toBeInTheDocument()
    expect(lookups).toHaveLength(0)
    expect(screen.getByRole('dialog', { name: qr.title })).toBeInTheDocument()

    camera.seeQr('somosr:recycler:CC:1001')
    await screen.findByRole('region', { name: t.pesajes.drawer.who })
    expect(lookups).toHaveLength(1)
  })

  it('refuses a document type this system does not know', async () => {
    const camera = installFakeCamera()
    serve()
    renderAt('/pesajes')
    await openScanner()
    camera.seeQr('somosr:recycler:ZZ:1001')
    expect(await screen.findByText(qr.unknownType)).toBeInTheDocument()
    expect(lookups).toHaveLength(0)
  })

  it('continues as an unregistered seller when the scanned document is not registered', async () => {
    const camera = installFakeCamera()
    serve()
    lookupReply = { status: 404, data: { detail: 'x', code: 'recycler_not_found' } }
    renderAt('/pesajes')
    await openScanner()
    camera.seeQr('somosr:recycler:CC:9999')

    expect(await screen.findByText(t.pesajes.drawer.person.notFound)).toBeInTheDocument()
    expect(screen.getByLabelText(t.pesajes.drawer.person.documentNumber)).toHaveValue('9999') // the document is filled in
    expect(screen.getByLabelText(t.pesajes.drawer.person.sellerName)).toBeInTheDocument()
  })

  it('releases the camera when the operator closes the scanner', async () => {
    const camera = installFakeCamera()
    serve()
    renderAt('/pesajes')
    const scanner = within(await openScanner())
    await waitFor(() => expect(screen.queryByText(qr.starting)).not.toBeInTheDocument()) // the camera is on
    await userEvent.click(scanner.getAllByRole('button', { name: qr.close }).at(-1)!) // the one in the footer

    await waitFor(() => expect(screen.queryByRole('dialog', { name: qr.title })).not.toBeInTheDocument())
    expect(camera.stopTrack).toHaveBeenCalled()
    expect(lookups).toHaveLength(0)
  })

  it('explains it when the camera permission is denied, and the operator can still search by document', async () => {
    const camera = installFakeCamera()
    camera.getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    serve()
    renderAt('/pesajes')
    const scanner = within(await openScanner())
    expect(await screen.findByText(qr.denied)).toBeInTheDocument()
    await userEvent.click(scanner.getAllByRole('button', { name: qr.close }).at(-1)!)
    expect(await screen.findByLabelText(t.pesajes.drawer.person.documentNumber)).toBeInTheDocument()
  })

  it('explains it when there is no camera', async () => {
    const camera = installFakeCamera()
    camera.getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' }))
    serve()
    renderAt('/pesajes')
    await openScanner()
    expect(await screen.findByText(qr.noCamera)).toBeInTheDocument()
  })

  it('explains it when the browser or the connection does not offer a camera', async () => {
    installFakeCamera()
    removeCameraApi()
    serve()
    renderAt('/pesajes')
    await openScanner()
    expect(await screen.findByText(qr.unsupported)).toBeInTheDocument()
  })

  it('has no accessibility violations while scanning', async () => {
    installFakeCamera()
    serve()
    renderAt('/pesajes')
    await openScanner()
    await waitFor(() => expect(screen.queryByText(qr.starting)).not.toBeInTheDocument())
    await expectNoA11yViolations()
  })
})
