import { t, interpolate } from './i18n'

interface ApiErrorShape {
  response?: {
    status?: number
    data?: { detail?: unknown }
    headers?: Record<string, unknown>
  }
}

// Pydantic prefixes messages raised by our own validators (the ones written for end users,
// e.g. password policy) with this; built-in type errors ("Field required") don't have it.
const CUSTOM_VALIDATOR_PREFIX = 'Value error, '

function validationMessage(detail: unknown[]): string {
  const messages = detail
    .map((item) => (item as { msg?: unknown })?.msg)
    .filter((msg): msg is string => typeof msg === 'string' && msg.startsWith(CUSTOM_VALIDATOR_PREFIX))
    .map((msg) => msg.slice(CUSTOM_VALIDATOR_PREFIX.length))
  // Built-in messages are technical English: show them only via the generic text.
  return messages.length > 0 ? [...new Set(messages)].join('. ') : t.errors.validation
}

function retryAfterSeconds(headers: Record<string, unknown> | undefined): number | null {
  const raw = headers?.['retry-after']
  const seconds = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null
}

/**
 * Turns a failed API call into text that is safe to render.
 *
 * The backend's `detail` is a string for most errors but an array of objects for 422
 * validation errors; passing it straight into JSX crashes React, so every `onError` goes
 * through here.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as ApiErrorShape)?.response
  if (!response) return t.errors.network

  const detail = response.data?.detail
  switch (response.status) {
    case 429: {
      const seconds = retryAfterSeconds(response.headers)
      return seconds ? interpolate(t.errors.tooManyRequestsWait, { seconds }) : t.errors.tooManyRequests
    }
    case 422:
      return Array.isArray(detail) ? validationMessage(detail) : t.errors.validation
    default:
      return typeof detail === 'string' && detail.trim() !== '' ? detail : fallback
  }
}
