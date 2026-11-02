import { useSyncExternalStore } from 'react'
import {
  DEFAULT_CASHBACK_SELECTION,
  isCashbackOfferId,
  MAX_CASHBACK_SELECTION,
  type CashbackOfferId,
} from './cashback'

const STORAGE_KEY = 'lumen.cashback.v1'

let cached: CashbackOfferId[] | null = null
const listeners = new Set<() => void>()

function persist(selection: CashbackOfferId[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Private browsing may reject writes; the in-memory selection still works.
  }
}

function read(): CashbackOfferId[] {
  if (typeof window === 'undefined') return DEFAULT_CASHBACK_SELECTION

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CASHBACK_SELECTION

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_CASHBACK_SELECTION

    const valid = [
      ...new Set(parsed.filter(isCashbackOfferId)),
    ].slice(0, MAX_CASHBACK_SELECTION)

    return valid.length > 0 ? valid : DEFAULT_CASHBACK_SELECTION
  } catch {
    return DEFAULT_CASHBACK_SELECTION
  }
}

export function getCashbackSelection(): CashbackOfferId[] {
  cached ??= read()
  return cached
}

export function toggleCashbackOffer(id: CashbackOfferId): boolean {
  const current = getCashbackSelection()
  const selected = current.includes(id)

  if (selected && current.length === 1) {
    return false
  }

  if (!selected && current.length >= MAX_CASHBACK_SELECTION) {
    return false
  }

  const next = selected
    ? current.filter((item) => item !== id)
    : [...current, id]

  cached = next
  persist(next)

  for (const listener of listeners) listener()
  return true
}

export function subscribeCashback(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCashbackSelection(): CashbackOfferId[] {
  return useSyncExternalStore(
    subscribeCashback,
    getCashbackSelection,
    getCashbackSelection,
  )
}
