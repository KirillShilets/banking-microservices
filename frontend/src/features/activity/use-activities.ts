import { useSyncExternalStore } from 'react'
import {
  getActivities,
  subscribeActivities,
} from './activity-store'
import type { Activity } from './types'

/**
 * External store keeps receipts available even if a page unmounts, while the
 * snapshot reference remains stable for useSyncExternalStore.
 */
export function useActivities(subject: string): Activity[] {
  return useSyncExternalStore(
    subscribeActivities,
    () => getActivities(subject),
    () => getActivities(subject),
  )
}
