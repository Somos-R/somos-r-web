import { vi } from 'vitest'
import jsQR from 'jsqr'

/**
 * A camera for tests: no lens, no browser, and not the real decoder. The test file must mock the decoder
 * (`vi.mock('jsqr', () => ({ default: vi.fn() }))`); this makes the page believe a video is playing and
 * lets the test choose what text the "camera" reads.
 */
export function installFakeCamera() {
  const stopTrack = vi.fn()
  const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(640)
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(480)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  } as unknown as CanvasRenderingContext2D)

  const decoder = vi.mocked(jsQR)
  decoder.mockReturnValue(null)

  return {
    getUserMedia,
    stopTrack,
    /** From now on the camera sees a QR with this text. */
    seeQr: (text: string) => decoder.mockReturnValue({ data: text } as ReturnType<typeof jsQR>),
    seeNothing: () => decoder.mockReturnValue(null),
  }
}

/** A browser without camera access (an insecure page, an old browser). */
export function removeCameraApi() {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
}
