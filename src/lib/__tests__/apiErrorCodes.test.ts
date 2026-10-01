import { describe, expect, it } from 'vitest'
import { getApiErrorMessage, getErrorCode, translateErrorCode } from '../apiError'
import { getAuthErrorMessage } from '../../services/auth'
import { t } from '../i18n'

const failure = (status: number, data: Record<string, unknown> = {}, headers: Record<string, unknown> = {}) => ({
  response: { status, data, headers },
})

// Every code the backend documents (hardening-tracker/frontend/codigos-de-error.md). When the
// backend adds one, add it here and to es.json: this test is the reminder.
const BACKEND_CODES = [
  'invalid_credentials', 'invalid_token', 'session_closed', 'session_outdated', 'account_disabled',
  'invalid_refresh_token', 'unauthorized',
  'forbidden', 'account_not_verified', 'user_type_not_visible', 'user_type_not_editable',
  'role_assignment_admin_only', 'role_assignment_other_organization', 'role_change_admin_only', 'cannot_change_own_role',
  'weighing_not_found', 'transaction_not_found', 'user_not_found', 'recycler_not_found', 'material_not_found',
  'warehouse_not_found', 'inventory_item_not_found', 'inventory_not_found', 'not_found',
  'invalid_transition', 'insufficient_stock', 'recycler_inactive', 'not_a_recycler', 'rejection_reason_required',
  'invalid_link', 'wrong_current_password',
  'account_already_exists', 'tax_id_already_registered',
  'invalid_role', 'method_not_allowed', 'internal_error',
  'invalid_id_type', 'association_required', 'invalid_association', 'no_organization', 'organization_not_active', 'invitation_not_pending',
  'export_too_large', 'link_not_found', 'link_already_requested', 'link_already_active', 'link_not_pending', 'link_not_removable',
]

describe('error code dictionary', () => {
  it.each(BACKEND_CODES)('%s has a Spanish message', (code) => {
    const message = translateErrorCode(code)
    expect(message).toBeTruthy()
    // A translation is text for the user, not the code itself or an English placeholder.
    expect(message).not.toBe(code)
    expect(message).not.toMatch(/_/)
  })

  it('does not resolve codes through Object.prototype', () => {
    for (const code of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(translateErrorCode(code)).toBeUndefined()
    }
  })

  it('ignores non-string codes', () => {
    expect(translateErrorCode(undefined)).toBeUndefined()
    expect(translateErrorCode(404)).toBeUndefined()
    expect(translateErrorCode({ nested: true })).toBeUndefined()
  })
})

describe('getErrorCode', () => {
  it('reads the stable code from the response body', () => {
    expect(getErrorCode(failure(404, { detail: 'x', code: 'weighing_not_found' }))).toBe('weighing_not_found')
    expect(getErrorCode(failure(404, { detail: 'x' }))).toBeUndefined()
    expect(getErrorCode(new Error('Network Error'))).toBeUndefined()
  })
})

describe('getApiErrorMessage with codes', () => {
  it('translates a 422 that carries a code with its own sentence, and keeps the generic text for the rest', () => {
    expect(getApiErrorMessage(failure(422, { detail: 'x', code: 'association_required' }), 'fallback')).toBe(t.apiErrors.association_required)
    expect(getApiErrorMessage(failure(422, { detail: 'x', code: 'invalid_association' }), 'fallback')).toBe(t.apiErrors.invalid_association)
    expect(getApiErrorMessage(failure(422, { detail: 'x', code: 'invalid_id_type' }), 'fallback')).toBe(t.errors.validation)
  })

  it('prefers the translated code over the backend wording, which may change', () => {
    const error = failure(404, { detail: 'Pesaje no encontrado (texto viejo)', code: 'weighing_not_found' })
    expect(getApiErrorMessage(error, 'fallback')).toBe(t.apiErrors.weighing_not_found)
  })

  it('falls back to the detail when the code is one this build does not know yet', () => {
    const error = failure(400, { detail: 'Algo nuevo del backend', code: 'brand_new_code' })
    expect(getApiErrorMessage(error, 'fallback')).toBe('Algo nuevo del backend')
  })

  it('falls back to the caller\'s text when there is neither a known code nor a detail', () => {
    expect(getApiErrorMessage(failure(400, { code: 'brand_new_code' }), 'fallback')).toBe('fallback')
  })

  it('still works against a backend that sends no code at all', () => {
    expect(getApiErrorMessage(failure(400, { detail: 'Texto del servidor' }), 'fallback')).toBe('Texto del servidor')
  })

  it('keeps the server text for insufficient stock, which says how much IS available', () => {
    const error = failure(400, { detail: 'Stock insuficiente: disponible 12 kg de Plástico', code: 'insufficient_stock' })
    expect(getApiErrorMessage(error, 'fallback')).toBe('Stock insuficiente: disponible 12 kg de Plástico')
    expect(getApiErrorMessage(failure(400, { code: 'insufficient_stock' }), 'fallback')).toBe(t.apiErrors.insufficient_stock)
  })

  it('keeps the per-field handling for validation errors', () => {
    const detail = [{ msg: 'Value error, La contraseña debe tener al menos 10 caracteres' }]
    expect(getApiErrorMessage(failure(422, { detail, code: 'validation_error' }), 'fallback'))
      .toBe('La contraseña debe tener al menos 10 caracteres')
  })

  it('translates invalid_role, a 422 that is not a per-field list', () => {
    expect(getApiErrorMessage(failure(422, { detail: 'Rol inválido', code: 'invalid_role' }), 'fallback'))
      .toBe(t.apiErrors.invalid_role)
  })

  it('keeps the wait time for rate limiting instead of a fixed sentence', () => {
    const error = failure(429, { detail: 'Too many', code: 'rate_limited' }, { 'retry-after': '45' })
    expect(getApiErrorMessage(error, 'fallback')).toContain('45 segundos')
  })

  it('does not let a code override a lost connection or a timeout', () => {
    expect(getApiErrorMessage(new Error('Network Error'), 'fallback')).toBe(t.errors.network)
  })
})

describe('getAuthErrorMessage with codes', () => {
  it('tells a disabled account apart, whether it arrives as 401 or 403', () => {
    expect(getAuthErrorMessage(failure(401, { code: 'account_disabled' }))).toBe(t.apiErrors.account_disabled)
    expect(getAuthErrorMessage(failure(403, { code: 'account_disabled' }))).toBe(t.apiErrors.account_disabled)
  })

  it('tells a pending or rejected recycler what happened', () => {
    expect(getAuthErrorMessage(failure(403, { detail: 'texto viejo', code: 'account_not_verified' })))
      .toBe(t.apiErrors.account_not_verified)
  })

  it('keeps the generic wording for wrong credentials, which also covers a temporary lock', () => {
    expect(getAuthErrorMessage(failure(401, { code: 'invalid_credentials' }))).toBe(t.auth.errors.invalidCredentials)
    expect(getAuthErrorMessage(failure(401))).toBe(t.auth.errors.invalidCredentials)
  })

  it('an unknown 401 code still reads as invalid credentials, never as a raw code', () => {
    expect(getAuthErrorMessage(failure(401, { code: 'brand_new_code' }))).toBe(t.auth.errors.invalidCredentials)
  })
})
