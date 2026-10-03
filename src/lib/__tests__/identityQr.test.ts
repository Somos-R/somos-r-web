import { describe, expect, it } from 'vitest'
import { formatIdentityQr, parseIdentityQr } from '../identityQr'

describe('parseIdentityQr', () => {
  it('reads the document type and number of a Somos R identity QR', () => {
    expect(parseIdentityQr('somosr:recycler:CC:1020304050')).toEqual({ idType: 'CC', idNumber: '1020304050' })
  })

  it('ignores surrounding spaces and the case of the prefix, and normalizes the type to upper case', () => {
    expect(parseIdentityQr('  SomosR:Recycler:ce:A1234-5 \n')).toEqual({ idType: 'CE', idNumber: 'A1234-5' })
  })

  it.each([
    ['empty text', ''],
    ['another kind of QR', 'https://example.com/pago?id=1'],
    ['another scheme', 'otra:recycler:CC:1020304050'],
    ['another kind of person', 'somosr:citizen:CC:1020304050'],
    ['a missing number', 'somosr:recycler:CC'],
    ['an extra part', 'somosr:recycler:CC:1020304050:extra'],
    ['a type that is not letters', 'somosr:recycler:C1:1020304050'],
    ['a number that is too short', 'somosr:recycler:CC:12'],
    ['a number that is too long', `somosr:recycler:CC:${'1'.repeat(21)}`],
    ['a number with symbols', 'somosr:recycler:CC:1020 3040;DROP'],
  ])('rejects %s', (_label, raw) => {
    expect(parseIdentityQr(raw)).toBeNull()
  })

  it('round-trips what formatIdentityQr writes', () => {
    const qr = { idType: 'PA', idNumber: 'X9876543' }
    expect(parseIdentityQr(formatIdentityQr(qr))).toEqual(qr)
  })
})
