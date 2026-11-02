export interface ValidationResult {
  valid: boolean
  message?: string
}


const PHONE_PATTERN = /^\+?[0-9]{10,15}$/
const MONEY_PATTERN = /^(?:0|[1-9]\d{0,16})(?:[.,]\d{1,2})?$/

export function validateName(value: string): ValidationResult {
  const normalized = value.trim()
  if (normalized.length < 3) {
    return { valid: false, message: 'Минимум 3 символа' }
  }
  if (normalized.length > 63) {
    return { valid: false, message: 'Не более 63 символов' }
  }
  return { valid: true }
}

/**
 * Validates an address by splitting on `@` instead of matching a regex with
 * overlapping quantifiers, which backtracks polynomially on hostile input.
 */
export function validateEmail(value: string): ValidationResult {
  const normalized = value.trim()
  if (!normalized) {
    return { valid: false, message: 'Укажите email' }
  }

  const at = normalized.indexOf('@')
  const domain = at >= 0 ? normalized.slice(at + 1) : ''
  const dot = domain.lastIndexOf('.')

  const invalid =
    normalized.length > 127 ||
    at <= 0 ||
    at !== normalized.lastIndexOf('@') ||
    /\s/.test(normalized) ||
    domain.length < 3 ||
    dot <= 0 ||
    dot === domain.length - 1

  if (invalid) {
    return { valid: false, message: 'Проверьте формат email' }
  }

  return { valid: true }
}

export function validatePhone(value: string): ValidationResult {
  if (!PHONE_PATTERN.test(value.trim())) {
    return { valid: false, message: 'Формат: +375291234567' }
  }
  return { valid: true }
}

/**
 * Validates user-entered money and always returns a canonical `0.00` string,
 * which is the safest JSON representation for a Java BigDecimal.
 */
export function normalizeMoneyInput(value: string): {
  value: string
  error?: string
} {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')

  if (!normalized) {
    return { value: '', error: 'Укажите сумму' }
  }

  if (!MONEY_PATTERN.test(normalized)) {
    return {
      value: '',
      error: 'Сумма: до 17 цифр и не более 2 знаков после точки',
    }
  }

  const [whole, fraction = ''] = normalized.split('.')
  const canonical = `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`

  if (canonical === '0.00') {
    return { value: '', error: 'Сумма должна быть больше нуля' }
  }

  return { value: canonical }
}

export function parseMoneyInputNumber(value: string): number {
  return Number(normalizeMoneyInput(value).value)
}

export function normalizePhoneInput(value: string): string {
  return value.replace(/[^\d+]/g, '').slice(0, 16)
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 12 || !digits.startsWith('375')) return value

  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`
}
