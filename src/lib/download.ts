/** Hands a file the app already holds in memory to the browser's download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const readText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

/**
 * An error answered to a file download arrives as a Blob, which hides the JSON `code` and `detail` the
 * error handling reads. Decode it and rethrow, so a failed export is reported like any other failed request.
 */
export async function unwrapBlobError(error: unknown): Promise<never> {
  const response = (error as { response?: { data?: unknown } }).response
  if (response?.data instanceof Blob) {
    try {
      response.data = JSON.parse(await readText(response.data))
    } catch {
      response.data = {}
    }
  }
  throw error
}

/** `pesajes-2026-03-31.csv`: the name of a download, stamped with today's date. */
export const csvFileName = (base: string): string => `${base}-${new Date().toISOString().slice(0, 10)}.csv`
