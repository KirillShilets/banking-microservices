import type { Activity, ActivityCategory } from './types'
import { toMinorUnits } from '../../lib/money'

export interface CategoryMeta {
  label: string
  color: string
  soft: string
}

export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  income: { label: 'Доход', color: '#1e7a57', soft: '#e7f6ef' },
  groceries: { label: 'Продукты', color: '#a9751c', soft: '#fdf3dd' },
  transport: { label: 'Транспорт', color: '#3b5bfd', soft: '#eef1ff' },
  subscriptions: { label: 'Подписки', color: '#cf5842', soft: '#fceeea' },
  transfer: { label: 'Переводы', color: '#6d5bd0', soft: '#f0edff' },
  cash: { label: 'Наличные', color: '#1e7a57', soft: '#e7f6ef' },
  topup: { label: 'Пополнения', color: '#4f6b0d', soft: '#f0fad3' },
  other: { label: 'Прочее', color: '#687182', soft: '#f1f2ee' },
}

export function activityMinor(activity: Activity): bigint {
  try {
    return toMinorUnits(activity.amount)
  } catch {
    return 0n
  }
}

export function isWithinCurrentMonth(value: string, now = new Date()): boolean {
  const date = new Date(value)
  return (
    !Number.isNaN(date.getTime()) &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

export interface MonthSummary {
  income: bigint
  expenses: bigint
  net: bigint
}

export function summariseMonth(
  activities: Activity[],
  now = new Date(),
): MonthSummary {
  let income = 0n
  let expenses = 0n

  for (const activity of activities) {
    if (!isWithinCurrentMonth(activity.createdAt, now)) continue

    const amount = activityMinor(activity)
    if (amount > 0n) income += amount
    if (amount < 0n) expenses += -amount
  }

  return { income, expenses, net: income - expenses }
}

export interface CategorySlice {
  category: ActivityCategory
  label: string
  total: bigint
  share: number
  color: string
  soft: string
}

export function expensesByCategory(
  activities: Activity[],
  now = new Date(),
): CategorySlice[] {
  const totals = new Map<ActivityCategory, bigint>()

  for (const activity of activities) {
    if (!isWithinCurrentMonth(activity.createdAt, now)) continue

    const amount = activityMinor(activity)
    if (amount >= 0n) continue

    totals.set(activity.category, (totals.get(activity.category) ?? 0n) + -amount)
  }

  const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0n)
  if (grandTotal === 0n) return []

  return [...totals.entries()]
    .map(([category, total]) => {
      const meta = CATEGORY_META[category]
      return {
        category,
        label: meta.label,
        total,
        share: Number(total) / Number(grandTotal),
        color: meta.color,
        soft: meta.soft,
      }
    })
    .sort((first, second) => (first.total > second.total ? -1 : 1))
}

export interface FilteredTotals {
  income: bigint
  expenses: bigint
  net: bigint
}

export function summariseActivities(activities: Activity[]): FilteredTotals {
  let income = 0n
  let expenses = 0n

  for (const activity of activities) {
    const amount = activityMinor(activity)
    if (amount > 0n) income += amount
    if (amount < 0n) expenses += -amount
  }

  return { income, expenses, net: income - expenses }
}
