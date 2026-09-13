export interface BillDraft {
  amount: string
  overdraftEnabled: boolean
}

export function parsePositiveId(
    value: string,
    fieldName: string,
): number {
  const normalized = value.trim()

  if (!/^[0-9]+$/.test(normalized)) {
    throw new Error(`${fieldName}: укажите положительный целый ID.`)
  }

  const id = Number(normalized)

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(
        `${fieldName}: ID выходит за допустимый диапазон.`,
    )
  }

  return id
}

export function parseAmount(
    value: string,
    fieldName: string,
): string {
  const normalized = value.trim().replace(',', '.')

  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(normalized)) {
    throw new Error(
        `${fieldName}: укажите положительную сумму `
        + 'не более чем с двумя знаками после точки.',
    )
  }

  const [rawInteger, rawFraction = ''] = normalized.split('.')
  const integer = rawInteger.replace(/^0+(?=\d)/, '')
  const fraction = rawFraction.padEnd(2, '0')

  if (integer.length > 17) {
    throw new Error(`${fieldName}: сумма слишком большая.`)
  }

  if (integer === '0' && fraction === '00') {
    throw new Error(`${fieldName}: сумма должна быть больше нуля.`)
  }

  return `${integer}.${fraction}`
}