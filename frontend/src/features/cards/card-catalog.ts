/**
 * Card products offered by the "open a card" flow.
 *
 * The backend only knows bills (`/bills`), so a card product is a presentation
 * layer: choosing a product opens a new bill and lends the card its name and
 * the perks listed in the wizard. Names mirror `bill-format.ts` so the cards a
 * customer opens here look like the rest of the shelf.
 */
export type CardProductId = 'debit' | 'savings' | 'travel' | 'plus'

export interface CardProduct {
  id: CardProductId
  /** Product name printed on the card. */
  name: string
  /** Human-readable product type. */
  kind: string
  tagline: string
  /** Monthly service fee in roubles; `0` means the product is free. */
  monthlyFee: number
  perks: string[]
  badge?: string
}

export const CARD_PRODUCTS: readonly CardProduct[] = [
  {
    id: 'debit',
    name: 'Lumen Debit',
    kind: 'Дебетовая карта',
    tagline: 'Для ежедневных покупок и переводов',
    monthlyFee: 0,
    perks: [
      'Бесплатное обслуживание',
      'Кэшбэк до 10% у партнёров',
      'Снятие без комиссии в банкоматах Lumen',
    ],
    badge: 'Популярная',
  },
  {
    id: 'savings',
    name: 'Lumen Savings',
    kind: 'Накопительная карта',
    tagline: 'Проценты на остаток каждый месяц',
    monthlyFee: 0,
    perks: [
      '+2% на остаток',
      'Отдельный счёт под финансовую цель',
      'Автопополнение по расписанию',
    ],
  },
  {
    id: 'travel',
    name: 'Lumen Travel',
    kind: 'Валютная карта',
    tagline: 'Оплата за рубежом без конвертации',
    monthlyFee: 149,
    perks: [
      'Счёт в валюте',
      'Курс без наценки банка',
      'Медицинская страховка в поездках',
    ],
    badge: 'Для поездок',
  },
  {
    id: 'plus',
    name: 'Lumen Debit Plus',
    kind: 'Премиальная карта',
    tagline: 'Повышенный кэшбэк и персональный менеджер',
    monthlyFee: 299,
    perks: [
      'Кэшбэк до 15% в трёх категориях',
      'Проход в бизнес-залы аэропортов',
      'Поддержка 24/7 без ожидания',
    ],
    badge: 'Премиум',
  },
] as const

export function findCardProduct(id: CardProductId): CardProduct {
  return CARD_PRODUCTS.find((product) => product.id === id) ?? CARD_PRODUCTS[0]
}

/** `0 ₽` for free products, `149 ₽/мес` otherwise. */
export function productFeeLabel(product: CardProduct): string {
  return product.monthlyFee === 0
    ? 'Бесплатно'
    : `${product.monthlyFee} ₽ в месяц`
}
