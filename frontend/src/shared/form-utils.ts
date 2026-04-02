export interface BillDraft {
  amount: string
  overdraftEnabled: boolean
}

export function parsePositiveId(value: string, fieldName: string): number {
  const id = Number(value)

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${fieldName}: укажите корректный положительный ID.`)
  }

  return id
}

export function parseAmount(value: string, fieldName: string): number {
  const normalizedValue = value.trim().replace(',', '.')
  const amount = Number(normalizedValue)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName}: сумма должна быть больше 0.`)
  }

  return Number(amount.toFixed(2))
}
