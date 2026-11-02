import { describe, expect, it } from 'vitest'
import {
  decimalToChartNumber,
  formatMoney,
  formatMoneyShort,
  isPositiveAmount,
  minorToDecimal,
  sumMoney,
  sumMoneyAsDecimal,
  toMinorUnits,
} from './money'

const NBSP = '\u00A0'

describe('money parsing', () => {
  it('parses decimals into minor units without float drift', () => {
    expect(toMinorUnits('0.00')).toBe(0n)
    expect(toMinorUnits('0.1')).toBe(10n)
    expect(toMinorUnits('0.29')).toBe(29n)
    expect(toMinorUnits(12.34)).toBe(1234n)
    expect(toMinorUnits('-5.05')).toBe(-505n)
    expect(toMinorUnits('1000')).toBe(100_000n)
  })

  it('rejects more than two decimals in string values', () => {
    expect(() => toMinorUnits('1.005')).toThrow('не более двух знаков')
  })

  it('accepts a comma as the decimal separator', () => {
    expect(toMinorUnits('12,34')).toBe(1234n)
  })

  it('normalises numbers to two decimals before converting', () => {
    expect(toMinorUnits(1.005)).toBe(100n)
    expect(toMinorUnits(1.999)).toBe(200n)
  })

  it('rejects values that are not finite numbers', () => {
    expect(() => toMinorUnits(Number.NaN)).toThrow('Некорректное денежное значение')
    expect(() => toMinorUnits(Number.POSITIVE_INFINITY)).toThrow()
  })

  it('formats minor units back to a canonical decimal', () => {
    expect(minorToDecimal(0n)).toBe('0.00')
    expect(minorToDecimal(5n)).toBe('0.05')
    expect(minorToDecimal(-1234n)).toBe('-12.34')
  })
})

describe('formatMoney', () => {
  it('always shows two decimals and the currency', () => {
    expect(formatMoney(0)).toBe(`0,00${NBSP}₽`)
    expect(formatMoney('12.5')).toBe(`12,50${NBSP}₽`)
  })

  it('groups thousands with a non-breaking space', () => {
    expect(formatMoney('1234567.89')).toBe(`1${NBSP}234${NBSP}567,89${NBSP}₽`)
  })

  it('supports negative and explicitly signed amounts', () => {
    expect(formatMoney('-10')).toBe(`−10,00${NBSP}₽`)
    expect(formatMoney('10', { signed: true })).toBe(`+10,00${NBSP}₽`)
  })

  it('can hide the currency and the zero fraction', () => {
    expect(formatMoney('10', { currency: false })).toBe('10,00')
    expect(formatMoney('10', { hideZeroFraction: true })).toBe(`10${NBSP}₽`)
    expect(formatMoney('10.50', { hideZeroFraction: true })).toBe(`10,50${NBSP}₽`)
  })

  it('uses a compact millions notation', () => {
    expect(formatMoney('2500000', { compact: true })).toContain('млн')
    expect(formatMoney('2500', { compact: true })).toBe(`2${NBSP}500,00${NBSP}₽`)
  })
})

describe('formatMoneyShort', () => {
  it('shortens millions and thousands', () => {
    expect(formatMoneyShort('3200000')).toBe('3,2 млн ₽')
    expect(formatMoneyShort('15000')).toBe('15 тыс. ₽')
    expect(formatMoneyShort('999')).toBe(`999,00${NBSP}₽`)
  })
})

describe('money aggregation', () => {
  it('sums values exactly', () => {
    expect(sumMoney(['0.10', '0.20', 0.3])).toBe(60n)
    expect(sumMoney([])).toBe(0n)
    expect(sumMoneyAsDecimal(['0.10', '0.20'])).toBe('0.30')
  })

  it('detects positive amounts only', () => {
    expect(isPositiveAmount('0.01')).toBe(true)
    expect(isPositiveAmount('0.00')).toBe(false)
    expect(isPositiveAmount('-1')).toBe(false)
  })

  it('converts decimals for charts', () => {
    expect(decimalToChartNumber('15.75')).toBeCloseTo(15.75, 5)
    expect(decimalToChartNumber(0)).toBe(0)
  })
})
