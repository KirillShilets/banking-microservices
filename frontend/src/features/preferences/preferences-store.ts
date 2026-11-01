import { useSyncExternalStore } from 'react'

export interface Preferences {
  /** Masks every balance and amount in the interface. */
  hideBalances: boolean
  /** In-app notification digest (stored locally, no backend call). */
  notifications: boolean
}

const STORAGE_KEY = 'lumen.preferences.v1'

const DEFAULT_PREFERENCES: Preferences = {
  hideBalances: false,
  notifications: true,
}

let cached: Preferences | null = null
const listeners = new Set<() => void>()

function read(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES

    const record = parsed as Record<string, unknown>
    return {
      hideBalances:
        typeof record.hideBalances === 'boolean'
          ? record.hideBalances
          : DEFAULT_PREFERENCES.hideBalances,
      notifications:
        typeof record.notifications === 'boolean'
          ? record.notifications
          : DEFAULT_PREFERENCES.notifications,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function persist(next: Preferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private browsing can reject writes; the in-memory snapshot still works.
  }
}

export function getPreferences(): Preferences {
  cached ??= read()
  return cached
}

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): void {
  const next = { ...getPreferences(), [key]: value }
  cached = next
  persist(next)

  for (const listener of listeners) listener()
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    subscribePreferences,
    getPreferences,
    getPreferences,
  )
}
