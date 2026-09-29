import { t } from './i18n'

// Mirrors the backend policy (app/core/passwords.py) so users get feedback before submitting.
// The backend stays the source of truth: it also rejects common passwords, and its message
// is shown if the server still refuses (see getApiErrorMessage).
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_BYTES = 72

export function validatePassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return t.account.password.validation.tooShort
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return t.account.password.validation.tooLong
  if (/^\d+$/.test(password)) return t.account.password.validation.onlyDigits
  if (new Set(password).size < 4) return t.account.password.validation.repetitive
  return undefined
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | undefined {
  return password === confirmation ? undefined : t.account.password.validation.mismatch
}
