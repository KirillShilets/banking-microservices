import { appConfig } from '../../config'
import { daysAgo } from '../../lib/date'
import type { Activity, NewActivity } from './types'

const SEED_ITEMS: Array<
  Omit<Activity, 'id' | 'createdAt'> & { daysAgo: number; hour: number }
> = [
  {
    kind: 'income',
    title: 'Зарплата',
    counterparty: 'Lumen Technologies',
    amount: '128500.00',
    billId: 5001,
    status: 'completed',
    category: 'income',
    daysAgo: 2,
    hour: 9,
  },
  {
    kind: 'payment',
    title: 'ВкусВилл',
    counterparty: 'Супермаркет · Минск',
    amount: '-3240.00',
    billId: 5001,
    status: 'completed',
    category: 'groceries',
    daysAgo: 1,
    hour: 19,
  },
  {
    kind: 'payment',
    title: 'Яндекс Go',
    counterparty: 'Транспорт',
    amount: '-890.00',
    billId: 5001,
    status: 'completed',
    category: 'transport',
    daysAgo: 1,
    hour: 8,
  },
  {
    kind: 'transfer',
    title: 'Перевод Анне К.',
    counterparty: 'Между клиентами',
    amount: '-15000.00',
    billId: 5001,
    status: 'completed',
    category: 'transfer',
    daysAgo: 3,
    hour: 14,
  },
  {
    kind: 'subscription',
    title: 'Netflix',
    counterparty: 'Развлечения',
    amount: '-1199.00',
    billId: 5001,
    status: 'completed',
    category: 'subscriptions',
    daysAgo: 4,
    hour: 11,
  },
  {
    kind: 'payment',
    title: 'Кофемания',
    counterparty: 'Кафе и рестораны',
    amount: '-640.00',
    billId: 5001,
    status: 'completed',
    category: 'groceries',
    daysAgo: 5,
    hour: 9,
  },
  {
    kind: 'payment',
    title: 'Лукойл',
    counterparty: 'АЗС',
    amount: '-4500.00',
    billId: 5001,
    status: 'completed',
    category: 'transport',
    daysAgo: 5,
    hour: 18,
  },
  {
    kind: 'transfer',
    title: 'На накопительный счёт',
    counterparty: 'Между своими счетами',
    amount: '-20000.00',
    billId: 5001,
    status: 'completed',
    category: 'transfer',
    daysAgo: 6,
    hour: 10,
  },
  {
    kind: 'deposit',
    title: 'Перевод от Анны К.',
    counterparty: 'Входящий перевод',
    amount: '15000.00',
    billId: 5001,
    status: 'completed',
    category: 'transfer',
    daysAgo: 7,
    hour: 16,
  },
  {
    kind: 'payment',
    title: 'Аренда квартиры',
    counterparty: 'Жильё',
    amount: '-32000.00',
    billId: 5001,
    status: 'completed',
    category: 'other',
    daysAgo: 9,
    hour: 12,
  },
  {
    kind: 'payment',
    title: 'Аптека 36,6',
    counterparty: 'Здоровье',
    amount: '-1240.00',
    billId: 5002,
    status: 'completed',
    category: 'other',
    daysAgo: 10,
    hour: 15,
  },
  {
    kind: 'deposit',
    title: 'Сбережения',
    counterparty: 'Пополнение накопительного счёта',
    amount: '20000.00',
    billId: 5002,
    status: 'completed',
    category: 'topup',
    daysAgo: 10,
    hour: 10,
  },
]

function seedActivity(): Activity[] {
  return SEED_ITEMS.map(({ daysAgo: days, hour, ...item }, index) => ({
    ...item,
    id: `seed-${index + 1}`,
    createdAt: daysAgo(days, hour),
  })).sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )
}

const STORAGE_PREFIX = 'lumen.activity.v1.'
const cache = new Map<string, Activity[]>()
const listeners = new Set<() => void>()

function storageKey(subject: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(subject)}`
}

function readStored(subject: string): Activity[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(subject))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null

    return parsed.filter(isActivity)
  } catch {
    return null
  }
}

function isActivity(value: unknown): value is Activity {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.counterparty === 'string' &&
    typeof item.amount === 'string' &&
    typeof item.billId === 'number' &&
    typeof item.createdAt === 'string' &&
    typeof item.status === 'string' &&
    typeof item.category === 'string' &&
    typeof item.kind === 'string'
  )
}

function persist(subject: string, activities: Activity[]): void {
  try {
    window.localStorage.setItem(storageKey(subject), JSON.stringify(activities))
  } catch {
    // Storage can be unavailable in private mode. The in-memory cache still works.
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

export function getActivities(subject: string): Activity[] {
  const cached = cache.get(subject)
  if (cached) return cached

  const stored = readStored(subject)
  const activities = stored ?? (appConfig.demoMode ? seedActivity() : [])
  cache.set(subject, activities)

  if (!stored && activities.length > 0) {
    persist(subject, activities)
  }

  return activities
}

export function subscribeActivities(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function recordActivity(subject: string, input: NewActivity): Activity {
  const activity: Activity = {
    id: crypto.randomUUID(),
    kind: input.kind,
    title: input.title,
    counterparty: input.counterparty,
    amount:
      typeof input.amount === 'number'
        ? input.amount.toFixed(2)
        : input.amount,
    billId: input.billId,
    createdAt: new Date().toISOString(),
    status: input.status ?? 'completed',
    category: input.category,
  }

  const next = [activity, ...getActivities(subject)]
  cache.set(subject, next)
  persist(subject, next)
  emit()

  return activity
}

export function clearActivities(subject: string): void {
  cache.set(subject, [])
  persist(subject, [])
  emit()
}
