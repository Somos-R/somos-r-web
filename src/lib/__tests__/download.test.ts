import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveBlob } from '../download'

afterEach(() => vi.restoreAllMocks())

describe('saveBlob', () => {
  it('clicks a temporary link with the file name and then releases the object URL', () => {
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      const link = document.querySelector('a[download]') as HTMLAnchorElement
      expect(link.download).toBe('pesajes.csv')
      expect(link.href).toBe('blob:fake')
    })

    saveBlob(new Blob(['a,b']), 'pesajes.csv')

    expect(click).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
