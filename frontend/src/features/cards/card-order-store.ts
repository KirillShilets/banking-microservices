import type { CardProductId } from './card-catalog'

/**
 * Card orders are device-local, like the activity feed and the cashback
 * selection. The backend has no card-issue endpoint (a card is a bill), so the
 * order — including the design the customer picked — lives in `localStorage`
 * and is shown again the next time the wizard opens.
 */
export type CardDelivery = 'digital' | 'plastic'

export type CardOrderStatus = 'issued' | 'design-review'

export interface CardOrder {
  id: string
  productId: CardProductId
  productName: string
  designId: string
  designName: string
  customDesign: boolean
  /** File name of the uploaded artwork; older stored orders have no value. */
  artworkName?: string | null
  email: string
  delivery: CardDelivery
  /** Bill opened for the card, once the backend confirmed it. */
  billId: number | null
  /** Design fee in roubles. */
  total: number
  createdAt: string
  status: CardOrderStatus
}

export interface NewCardOrder {
  productId: CardProductId
  productName: string
  designId: string
  designName: string
  customDesign: boolean
  artworkName: string | null
  email: string
  delivery: CardDelivery
  billId: number | null
  total: number
}

const STORAGE_KEY = 'lumen.card-orders.v1'
const MAX_ORDERS = 20

function storageKey(subject: string): string {
  return `${STORAGE_KEY}.${subject}`
}

function isCardOrder(value: unknown): value is CardOrder {
  if (typeof value !== 'object' || value === null) return false
  const order = value as Partial<CardOrder>
  return (
    typeof order.id === 'string' &&
    typeof order.productName === 'string' &&
    typeof order.designName === 'string' &&
    typeof order.email === 'string' &&
    typeof order.createdAt === 'string' &&
    (order.billId === null || typeof order.billId === 'number')
  )
}

function readStored(subject: string): CardOrder[] {
  try {
    const raw = window.localStorage.getItem(storageKey(subject))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCardOrder)
  } catch {
    return []
  }
}

function persist(subject: string, orders: CardOrder[]): void {
  try {
    window.localStorage.setItem(storageKey(subject), JSON.stringify(orders.slice(0, MAX_ORDERS)))
  } catch {
    // A full or blocked storage must not break the ordering flow.
  }
}

/** Orders for the current user, newest first. */
export function getCardOrders(subject: string): CardOrder[] {
  return readStored(subject)
}

export function addCardOrder(subject: string, input: NewCardOrder): CardOrder {
  const order: CardOrder = {
    ...input,
    id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    // Custom artwork is reviewed by the design team before the card is printed.
    status: input.customDesign ? 'design-review' : 'issued',
  }

  persist(subject, [order, ...readStored(subject)])
  return order
}

export function clearCardOrders(subject: string): void {
  try {
    window.localStorage.removeItem(storageKey(subject))
  } catch {
    // Ignore: nothing to clean up when storage is unavailable.
  }
}
