/**
 * The identity QR of a recycler, as the scale operator scans it.
 *
 * The format is deliberately plain: `somosr:recycler:<document type>:<document number>`, for example
 * `somosr:recycler:CC:1020304050`. It identifies WHO is delivering, nothing more: the web looks that document
 * up exactly as if the operator had typed it (`GET /recyclers/lookup`), so a QR grants no access and proves
 * nothing by itself; the answer (association, registry status, link with the ECA) still comes from the server.
 *
 * Whoever generates the QR (the mobile app, the backend) must use this same text. If a signed token replaces it
 * later (US-0.17), only this file and the lookup request change.
 */
const PREFIX = 'somosr:recycler'

export interface IdentityQr {
  /** Upper case, like the catalog codes (CC, CE, TI, PA...). */
  idType: string
  idNumber: string
}

const ID_TYPE = /^[A-Za-z]{1,10}$/
// The same 3-20 characters the weighing form accepts for a document.
const ID_NUMBER = /^[A-Za-z0-9-]{3,20}$/

export function formatIdentityQr({ idType, idNumber }: IdentityQr): string {
  return `${PREFIX}:${idType}:${idNumber}`
}

/** The document a scanned text stands for, or null when it is not a Somos R identity QR. */
export function parseIdentityQr(raw: string): IdentityQr | null {
  const parts = raw.trim().split(':')
  if (parts.length !== 4) return null
  const [scheme, kind, idType, idNumber] = parts
  if (`${scheme}:${kind}`.toLowerCase() !== PREFIX) return null
  if (!ID_TYPE.test(idType) || !ID_NUMBER.test(idNumber)) return null
  return { idType: idType.toUpperCase(), idNumber }
}
