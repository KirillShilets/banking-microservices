/**
 * Removes data that belongs to the signed-in user from `localStorage`.
 *
 * Account ids, demo activity, card orders and card designs are all keyed per
 * subject, but they outlive the session: on a shared machine the next user would
 * otherwise see the previous user's data. Global preferences (theme, dismissed
 * hints) are intentionally kept.
 */
const USER_SCOPED_PREFIXES = [
  'lumen.account-id.',
  'lumen.activity.v1.',
  'lumen.card-orders.v1',
  'lumen.card-designs.v1',
] as const

export function clearUserScopedData(storage: Storage = window.localStorage): void {
  const keysToRemove: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)

    if (key !== null && USER_SCOPED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key)
  }
}
