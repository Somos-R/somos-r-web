import { describe, it, expect, beforeEach } from 'vitest'
import { validatePassword, validatePasswordConfirmation } from '../passwordPolicy'
import { consumeLoginNotice, setLoginNotice } from '../loginNotice'
import { t } from '../i18n'

describe('validatePassword', () => {
  it('accepts a password that meets the backend policy', () => {
    expect(validatePassword('correcto-2026')).toBeUndefined()
  })

  it('rejects fewer than 10 characters', () => {
    expect(validatePassword('corta-123')).toBe(t.account.password.validation.tooShort)
  })

  it('rejects more than 72 bytes, counting multi-byte characters', () => {
    expect(validatePassword('a'.repeat(72) + 'b')).toBe(t.account.password.validation.tooLong)
    // 40 x "ñ" is 40 characters but 80 bytes.
    expect(validatePassword('ñ'.repeat(40))).toBe(t.account.password.validation.tooLong)
    expect(validatePassword('abcdefgh'.repeat(9))).toBeUndefined() // exactly 72 bytes
  })

  it('rejects digits-only and repetitive passwords', () => {
    expect(validatePassword('1234567890')).toBe(t.account.password.validation.onlyDigits)
    expect(validatePassword('abababababab')).toBe(t.account.password.validation.repetitive)
  })
})

describe('validatePasswordConfirmation', () => {
  it('requires both values to match', () => {
    expect(validatePasswordConfirmation('abc', 'abc')).toBeUndefined()
    expect(validatePasswordConfirmation('abc', 'abd')).toBe(t.account.password.validation.mismatch)
  })
})

describe('login notice', () => {
  beforeEach(() => sessionStorage.clear())

  it('is delivered once and then gone', () => {
    setLoginNotice('hola')
    expect(consumeLoginNotice()).toBe('hola')
    expect(consumeLoginNotice()).toBeNull()
  })
})
