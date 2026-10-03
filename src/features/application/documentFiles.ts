import { interpolate, t } from '../../lib/i18n'

/** The largest document the backend accepts. It checks again (and by the file's content, not its name). */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
export const MAX_DOCUMENT_MB = MAX_DOCUMENT_BYTES / (1024 * 1024)

/** What the file picker offers; the backend only accepts these three kinds. */
export const DOCUMENT_ACCEPT = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg'
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const ALLOWED_EXTENSION = /\.(pdf|png|jpe?g)$/i

/**
 * Why a chosen file is not worth uploading, in words for the applicant, or undefined when it looks fine.
 * A courtesy to answer before a slow upload: the backend decides by the file's content.
 */
export function documentFileProblem(file: File): string | undefined {
  if (file.size === 0) return t.solicitud.documents.validation.empty
  if (file.size > MAX_DOCUMENT_BYTES) return interpolate(t.solicitud.documents.validation.tooLarge, { max: MAX_DOCUMENT_MB })
  // The browser reports the type from the extension; some systems report nothing, so the extension counts too.
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSION.test(file.name)) return t.solicitud.documents.validation.type
  return undefined
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
