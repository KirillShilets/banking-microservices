import { useSyncExternalStore } from 'react'
import type { CardPattern } from './card-designs'

/**
 * The design a customer picked for a card, keyed by bill id.
 *
 * Lives on the device (like the activity feed and cashback selection) so the
 * sidebar card switcher and the receipt can show the photo that was uploaded
 * without asking the backend — it has no design fields.
 */
export interface SavedCardDesign {
  billId: number
  designId: string
  paletteId: string
  pattern: CardPattern
  /** Small JPEG data URL (≈320×202) used for previews. */
  thumb: string | null
  artworkName: string | null
}

interface CacheEntry {
  raw: string | null
  value: SavedCardDesign[]
}

const STORAGE_KEY = 'lumen.card-designs.v1'
const listeners = new Set<() => void>()
const cache = new Map<string, CacheEntry>()
const EMPTY: SavedCardDesign[] = []

function storageKey(subject: string): string {
  return `${STORAGE_KEY}.${subject}`
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

function isSavedDesign(value: unknown): value is SavedCardDesign {
  if (typeof value !== 'object' || value === null) return false
  const design = value as Partial<SavedCardDesign>
  return (
    typeof design.billId === 'number' &&
    typeof design.designId === 'string' &&
    typeof design.paletteId === 'string' &&
    typeof design.pattern === 'string'
  )
}

function readRaw(subject: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(subject))
  } catch {
    return null
  }
}

/**
 * Parsed designs per user. The cache keeps the array identity stable between
 * reads, which `useSyncExternalStore` requires.
 */
export function getCardDesigns(subject: string): SavedCardDesign[] {
  const raw = readRaw(subject)
  const cached = cache.get(subject)
  if (cached && cached.raw === raw) return cached.value

  let value: SavedCardDesign[] = EMPTY
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) value = parsed.filter(isSavedDesign)
    } catch {
      value = EMPTY
    }
  }

  cache.set(subject, { raw, value })
  return value
}

export function findCardDesign(
  designs: SavedCardDesign[],
  billId: number,
): SavedCardDesign | null {
  return designs.find((design) => design.billId === billId) ?? null
}

export function saveCardDesign(subject: string, design: SavedCardDesign): void {
  try {
    const next = [design, ...getCardDesigns(subject).filter((item) => item.billId !== design.billId)]
    window.localStorage.setItem(storageKey(subject), JSON.stringify(next.slice(0, 30)))
  } catch {
    // Quota or private mode: previews degrade to the default card theme.
  }
  emit()
}

export function subscribeCardDesigns(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Designs for the current user, reactive to `saveCardDesign`. */
export function useCardDesigns(subject: string): SavedCardDesign[] {
  return useSyncExternalStore(
    subscribeCardDesigns,
    () => getCardDesigns(subject),
    () => EMPTY,
  )
}

const ACTIVE_KEY = 'lumen.active-card.v1'

function activeKey(subject: string): string {
  return `${ACTIVE_KEY}.${subject}`
}

/** Bill id the customer picked in the sidebar card switcher. */
export function getActiveCardId(subject: string): number | null {
  try {
    const raw = window.localStorage.getItem(activeKey(subject))
    const id = raw ? Number(raw) : Number.NaN
    return Number.isSafeInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function setActiveCardId(subject: string, billId: number | null): void {
  try {
    if (billId === null) {
      window.localStorage.removeItem(activeKey(subject))
    } else {
      window.localStorage.setItem(activeKey(subject), String(billId))
    }
  } catch {
    // Ignore: the switcher still works for the current session.
  }
  emit()
}

export function useActiveCardId(subject: string): number | null {
  return useSyncExternalStore(
    subscribeCardDesigns,
    () => getActiveCardId(subject),
    () => null,
  )
}
