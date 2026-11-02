import { describe, expect, it } from 'vitest'
import {
  formatPhone,
  normalizeMoneyInput,
  normalizePhoneInput,
  parseMoneyInputNumber,
  validateEmail,
  validateName,
  validatePhone,
} from './validation'

describe('validateName', () => {
  it('accepts names of a reasonable length', () => {
    expect(validateName('Кира Воронцова')).toEqual({ valid: true })
  })

  it('rejects too short and too long names', () => {
    expect(validateName(' А ').valid).toBe(false)
    expect(validateName('a'.repeat(64)).valid).toBe(false)
  })
})

describe('validateEmail', () => {
  it('accepts a regular address', () => {
    expect(validateEmail('kira@lumen.bank')).toEqual({ valid: true })
  })

  it('rejects an empty value and broken formats', () => {
    expect(validateEmail('   ')).toEqual({ valid: false, message: 'Укажите email' })
    expect(validateEmail('kira@').valid).toBe(false)
    expect(validateEmail('kira lumen.bank').valid).toBe(false)
    expect(validateEmail('@lumen.bank').valid).toBe(false)
  })
})

describe('validatePhone', () => {
  it('accepts the +375 format', () => {
    expect(validatePhone('+375291234567')).toEqual({ valid: true })
  })

  it('rejects empty and non-phone input', () => {
    expect(validatePhone('').valid).toBe(false)
    expect(validatePhone('abc').valid).toBe(false)
  })
})

describe('normalizeMoneyInput', () => {
  it('canonicalises a dot or comma decimal', () => {
    expect(normalizeMoneyInput('1,5')).toEqual({ value: '1.50' })
    expect(normalizeMoneyInput('12.34')).toEqual({ value: '12.34' })
    expect(normalizeMoneyInput(' 7 ')).toEqual({ value: '7.00' })
  })

  it('rejects empty, zero and negative input', () => {
    expect(normalizeMoneyInput('')).toEqual({ value: '', error: 'Укажите сумму' })
    expect(normalizeMoneyInput('0').value).toBe('')
    expect(normalizeMoneyInput('-5').value).toBe('')
  })

  it('rejects text and broken separators', () => {
    expect(normalizeMoneyInput('abc').value).toBe('')
    expect(normalizeMoneyInput('1.2.3').value).toBe('')
  })

  it('rejects more than two decimals', () => {
    const result = normalizeMoneyInput('9.999')
    expect(result.value).toBe('')
    expect(result.error).toContain('2 знаков')
  })
})

describe('parseMoneyInputNumber', () => {
  it('returns a number for valid input and zero for empty input', () => {
    expect(parseMoneyInputNumber('2,60')).toBeCloseTo(2.6, 5)
    expect(parseMoneyInputNumber('')).toBe(0)
  })
})

describe('phone helpers', () => {
  it('keeps only digits and a leading plus', () => {
    expect(normalizePhoneInput('+375 (29) 123-45-67')).toBe('+37529123 4567'.replace(' ', ''))
    expect(normalizePhoneInput('8-029-123-45-67')).toBe('80291234567')
  })

  it('formats a complete Belarusian number', () => {
    expect(formatPhone('+375291234567')).toBe('+375 29 123-45-67')
    expect(formatPhone('123')).toBe('123')
  })
})

describe('hostile input (ReDoS guard)', () => {
  it('rejects a 50 000 character email quickly', () => {
    const hostile = `${'a'.repeat(50_000)}@${'b'.repeat(50_000)}`
    const startedAt = performance.now()
    const result = validateEmail(hostile)
    const elapsed = performance.now() - startedAt

    expect(result).toEqual({ valid: false, message: 'Проверьте формат email' })
    expect(elapsed).toBeLessThan(50)
  })
})
