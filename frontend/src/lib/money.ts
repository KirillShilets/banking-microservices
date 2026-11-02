import type { DecimalValue } from '../types/money'

const CURRENCY_SYMBOL = '₽'
/** Non-breaking space: a sum never wraps between digits and the currency sign. */
const NBSP = '\u00A0'
const MINOR_UNITS = 100n

/**
 * Parses a backend decimal into integer minor units. All arithmetic in the UI
 * (balances, totals, charts) uses BigInt to avoid floating point drift.
 */
export function toMinorUnits(value: DecimalValue): bigint {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Некорректное денежное значение')
    }

    // API values have scale 2; using a string keeps values below 2^53 exact.
    return toMinorUnits(value.toFixed(2))
  }

  const normalized = value.trim().replace(',', '.')

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error('Некорректное денежное значение')
  }

  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [whole, fraction = ''] = unsigned.split('.')

  if (fraction.length > 2) {
    throw new Error('Денежное значение должно иметь не более двух знаков после точки')
  }

  const minor = BigInt(whole) * MINOR_UNITS + BigInt(fraction.padEnd(2, '0'))

  return negative ? -minor : minor
}

/**
 * Groups integer digits in threes with a non-breaking space. A loop is used
 * instead of the classic `\B(?=(\d{3})+(?!\d))` regex, whose nested quantifiers
 * backtrack polynomially on long inputs.
 */
function groupThousands(digits: string): string {
  let grouped = ''

  for (let index = 0; index < digits.length; index += 1) {
    grouped += digits[index]
    const remaining = digits.length - index - 1
    if (remaining > 0 && remaining % 3 === 0) grouped += NBSP
  }

  return grouped
}

export function formatMoney(
  value: DecimalValue,
  options: {
    signed?: boolean
    currency?: boolean
    hideZeroFraction?: boolean
    compact?: boolean
  } = {},
): string {
  const minor = toMinorUnits(value)
  const absolute = minor < 0n ? -minor : minor

  if (options.compact && absolute >= 1_000_000_00n) {
    const millions = Number(absolute / 1_000_000_00n)
    const remainder = Number(absolute % 1_000_000_00n) / 1_000_000_00
    const whole = Math.trunc(millions + remainder)
    const fraction = Math.round(((millions + remainder) % 1) * 10)
    const sign = minor < 0n ? '−' : options.signed && minor > 0n ? '+' : ''
    return `${sign}${whole.toLocaleString('ru-RU')}${fraction ? `,${fraction}` : ''}${NBSP}млн${options.currency === false ? '' : `${NBSP}${CURRENCY_SYMBOL}`}`.trim()
  }

  const whole = groupThousands((absolute / MINOR_UNITS).toString())
    .toString()

  const fraction = (absolute % MINOR_UNITS).toString().padStart(2, '0')
  const showFraction = !(options.hideZeroFraction && fraction === '00')
  const sign = minor < 0n ? '−' : options.signed && minor > 0n ? '+' : ''
  const amount = showFraction ? `${whole},${fraction}` : whole
  const currency = options.currency === false ? '' : `${NBSP}${CURRENCY_SYMBOL}`

  return `${sign}${amount}${currency}`
}

/** Compact notation used inside charts and narrow metric cards. */
export function formatMoneyShort(value: DecimalValue): string {
  const minor = toMinorUnits(value)
  const absolute = minor < 0n ? -minor : minor

  if (absolute >= 1_000_000_00n) {
    return `${(Number(absolute) / 100_000_000).toFixed(1).replace('.', ',')} млн ₽`
  }

  if (absolute >= 10_000_00n) {
    return `${Math.round(Number(absolute) / 100_000)} тыс. ₽`
  }

  return formatMoney(value)
}

export function sumMoney(values: DecimalValue[]): bigint {
  return values.reduce((total, value) => total + toMinorUnits(value), 0n)
}

export function sumMoneyAsDecimal(values: DecimalValue[]): string {
  const minor = sumMoney(values)
  return minorToDecimal(minor)
}

export function minorToDecimal(minor: bigint): string {
  const negative = minor < 0n
  const absolute = negative ? -minor : minor
  const whole = absolute / MINOR_UNITS
  const fraction = (absolute % MINOR_UNITS).toString().padStart(2, '0')

  return `${negative ? '-' : ''}${whole}.${fraction}`
}

export function decimalToChartNumber(value: DecimalValue): number {
  return Number(toMinorUnits(value)) / 100
}

export function isPositiveAmount(value: DecimalValue): boolean {
  try {
    return toMinorUnits(value) > 0n
  } catch {
    return false
  }
}
