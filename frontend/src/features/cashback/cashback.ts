import type { Activity, ActivityCategory } from '../activity/types'
import { activityMinor, isWithinCurrentMonth } from '../activity/analytics'

export type CashbackOfferId = 'groceries' | 'transport' | 'subscriptions' | 'other'

export interface CashbackOffer {
  id: CashbackOfferId
  title: string
  description: string
  percent: number
  category: ActivityCategory
}

export const MAX_CASHBACK_SELECTION = 3
export const CASHBACK_CAP_MINOR = 300_000n // 3 000 ₽ per month

export const CASHBACK_OFFERS: CashbackOffer[] = [
  {
    id: 'groceries',
    title: 'Супермаркеты',
    description: 'Продукты, доставка и магазины у дома',
    percent: 5,
    category: 'groceries',
  },
  {
    id: 'transport',
    title: 'Транспорт',
    description: 'Такси, метро и заправки',
    percent: 3,
    category: 'transport',
  },
  {
    id: 'subscriptions',
    title: 'Подписки',
    description: 'Музыка, кино и цифровые сервисы',
    percent: 2,
    category: 'subscriptions',
  },
  {
    id: 'other',
    title: 'Остальные покупки',
    description: 'Аптеки, кафе и прочие расходы',
    percent: 1,
    category: 'other',
  },
]

export const DEFAULT_CASHBACK_SELECTION: CashbackOfferId[] = [
  'groceries',
  'transport',
  'subscriptions',
]

export function isCashbackOfferId(value: unknown): value is CashbackOfferId {
  return (
    value === 'groceries' ||
    value === 'transport' ||
    value === 'subscriptions' ||
    value === 'other'
  )
}

export interface CashbackRow extends CashbackOffer {
  spend: bigint
  reward: bigint
  selected: boolean
}

export interface CashbackSummary {
  rows: CashbackRow[]
  estimated: bigint
  cap: bigint
  selectedSpend: bigint
  selectedCount: number
}

export function calculateCashback(
  activities: Activity[],
  selection: CashbackOfferId[],
): CashbackSummary {
  const selectedIds = new Set(selection)

  const rows: CashbackRow[] = CASHBACK_OFFERS.map((offer) => {
    const spend = activities.reduce((total, activity) => {
      if (
        activity.category !== offer.category ||
        activity.status !== 'completed' ||
        !isWithinCurrentMonth(activity.createdAt)
      ) {
        return total
      }

      const amount = activityMinor(activity)
      return amount < 0n ? total - amount : total
    }, 0n)

    const selected = selectedIds.has(offer.id)
    const reward = selected
      ? (spend * BigInt(offer.percent)) / 100n
      : 0n

    return { ...offer, spend, reward, selected }
  })

  const rawTotal = rows.reduce((total, row) => total + row.reward, 0n)
  const selectedSpend = rows.reduce(
    (total, row) => (row.selected ? total + row.spend : total),
    0n,
  )

  return {
    rows,
    estimated: rawTotal > CASHBACK_CAP_MINOR ? CASHBACK_CAP_MINOR : rawTotal,
    cap: CASHBACK_CAP_MINOR,
    selectedSpend,
    selectedCount: rows.filter((row) => row.selected).length,
  }
}
