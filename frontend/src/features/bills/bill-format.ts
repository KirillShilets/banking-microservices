import type { BillResponseDTO } from '../../dto/response'

export interface BillProduct {
  /** Product name printed on the card. */
  name: string
  /** Human-readable product type. */
  kind: string
}

const CARD_PRODUCTS: BillProduct[] = [
  { name: 'Lumen Debit', kind: 'Дебетовая карта' },
  { name: 'Lumen Savings', kind: 'Накопительный счёт' },
  { name: 'Lumen Debit Plus', kind: 'Дебетовая карта' },
  { name: 'Lumen Travel', kind: 'Валютная карта' },
]

/**
 * The backend exposes bills without a product type, so the UI maps the
 * ordered products (default bill first) to a small, stable card line-up.
 */
export function billProduct(bill: BillResponseDTO, index: number): BillProduct {
  if (bill.isDefault) return CARD_PRODUCTS[0]
  return CARD_PRODUCTS[Math.min(index, CARD_PRODUCTS.length - 1)]
}

export function billDisplayName(bill: BillResponseDTO): string {
  return bill.isDefault ? 'Основной счёт' : 'Дополнительный счёт'
}

export function billLast4(bill: BillResponseDTO): string {
  return String(bill.billId).padStart(4, '0').slice(-4)
}
