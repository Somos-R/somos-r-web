import { interpolate, t } from '../../lib/i18n'
import type { ApplicationField, ApplicationView, UpdateApplicationPayload } from '../../services/applications'

/** The order the form shows them in. */
export const FIELD_ORDER: ApplicationField[] = [
  'legal_name', 'tax_id', 'legal_representative', 'contact_email', 'contact_phone', 'city', 'address',
  'applicant_name', 'applicant_id_type', 'applicant_id_number', 'applicant_phone',
]

// The same limits the backend enforces, so a too-long value is explained here instead of failing as a 422.
const MAX_LENGTH: Record<ApplicationField, number> = {
  legal_name: 255,
  tax_id: 50,
  legal_representative: 255,
  contact_email: 255,
  contact_phone: 20,
  city: 100,
  address: 300,
  applicant_name: 255,
  applicant_id_type: 10,
  applicant_id_number: 20,
  applicant_phone: 20,
}

/** These two can never be emptied: the organization needs a name and the application needs an author. */
const NAMES: ApplicationField[] = ['legal_name', 'applicant_name']

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type FormValues = Record<ApplicationField, string>

export const toValues = (view: ApplicationView): FormValues =>
  Object.fromEntries(FIELD_ORDER.map((field) => [field, view[field] ?? ''])) as FormValues

/** The error to show for one field, or undefined when it is fine to save. */
export function validateField(field: ApplicationField, raw: string): string | undefined {
  const value = raw.trim()
  if (NAMES.includes(field) && value.length < 2) return t.solicitud.form.validation.nameShort
  if (value.length > MAX_LENGTH[field]) return interpolate(t.solicitud.form.validation.tooLong, { max: MAX_LENGTH[field] })
  if (field === 'contact_email' && value && !EMAIL_PATTERN.test(value)) return t.solicitud.form.validation.emailInvalid
  return undefined
}

/**
 * Only what the applicant changed, ready for `PATCH /applications/current`. A field they emptied is sent as
 * `null`, which the backend reads as "clear it" (an empty string would fail the email format).
 */
export function changedFields(view: ApplicationView, values: FormValues): UpdateApplicationPayload {
  const payload: UpdateApplicationPayload = {}
  for (const field of FIELD_ORDER) {
    const value = values[field].trim()
    if (value !== (view[field] ?? '')) payload[field] = value === '' ? null : value
  }
  return payload
}
