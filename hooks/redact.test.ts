import { expect, test } from 'claude-code/testing'

import { redact, redactDeep } from './redact'

test('hides emails, money, phone, IBAN, card and keys', async () => {
  const text = [
    'mail: ali.veli@example.com',
    'tutar: 1.250,00 TL ve $49.99 ve €12',
    'tel: +90 532 123 45 67',
    'iban: TR33 0006 1005 1978 6457 8413 26',
    'kart: 4111 1111 1111 1111',
    'key: sk-ant-api03-abcdefghijklmnopqrstuv',
    'Authorization: Bearer abcdef123456789',
  ].join('\n')
  const out = redact(text)
  for (const secret of ['ali.veli', '1.250', '49.99', '€12', '532', 'TR33', '4111', 'sk-ant', 'abcdef123']) {
    expect(out.includes(secret)).toBe(false)
  }
  expect(out.includes('mail:')).toBe(true)
  expect(out.includes('Bearer')).toBe(true)
})

test('leaves normal text alone', async () => {
  const text = 'Ran 3 tests in 2.5s, line 120, version 2.1.288'
  expect(redact(text)).toBe(text)
})

test('keeps object shape', async () => {
  const out = redactDeep({ stdout: 'a@b.co', code: 0, list: ['x', '$5'] })
  expect(out).toEqual({ stdout: '•••••', code: 0, list: ['x', '•••••'] })
})
