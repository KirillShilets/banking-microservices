import { beforeEach, describe, expect, it } from 'vitest'
import { addCardOrder, clearCardOrders, getCardOrders } from './card-order-store'

const SUBJECT = 'demo-banking-user'

const BASE_ORDER = {
  productId: 'debit' as const,
  productName: 'Lumen Debit',
  designId: 'midnight',
  designName: 'Midnight',
  customDesign: false,
  artworkName: null,
  email: 'kira@example.com',
  delivery: 'digital' as const,
  billId: 12,
  total: 0,
}

describe('card order store', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores an issued order for the current user only', () => {
    const order = addCardOrder(SUBJECT, BASE_ORDER)

    expect(order.status).toBe('issued')
    expect(order.billId).toBe(12)
    expect(getCardOrders(SUBJECT)).toHaveLength(1)
    expect(getCardOrders('another-user')).toHaveLength(0)
  })

  it('keeps the newest order first', () => {
    const first = addCardOrder(SUBJECT, BASE_ORDER)
    const second = addCardOrder(SUBJECT, { ...BASE_ORDER, productName: 'Lumen Travel' })

    expect(getCardOrders(SUBJECT).map((order) => order.id)).toEqual([second.id, first.id])
  })

  it('sends custom artwork to design review', () => {
    const order = addCardOrder(SUBJECT, {
      ...BASE_ORDER,
      designId: 'custom',
      designName: 'Свой дизайн · Графит',
      customDesign: true,
      total: 990,
    })

    expect(order.status).toBe('design-review')
    expect(order.total).toBe(990)
  })

  it('survives malformed storage content', () => {
    window.localStorage.setItem(`lumen.card-orders.v1.${SUBJECT}`, '{"nope":true}')

    expect(getCardOrders(SUBJECT)).toEqual([])
  })

  it('clears stored orders', () => {
    addCardOrder(SUBJECT, BASE_ORDER)
    clearCardOrders(SUBJECT)

    expect(getCardOrders(SUBJECT)).toEqual([])
  })
})
