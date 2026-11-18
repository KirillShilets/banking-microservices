import { describe, expect, it } from 'vitest'
import { clearUserScopedData } from './user-data'

function createStorage(entries: Record<string, string>): Storage {
  const store = new Map(Object.entries(entries))

  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  }
}

describe('clearUserScopedData', () => {
  it('removes data that belongs to the signed-in user', () => {
    const storage = createStorage({
      'lumen.account-id.subject-1': '7',
      'lumen.activity.v1.subject-1': '[]',
      'lumen.card-orders.v1.subject-1': '[]',
      'lumen.card-designs.v1': '[]',
    })

    clearUserScopedData(storage)

    expect(storage.length).toBe(0)
  })

  it('keeps global preferences', () => {
    const storage = createStorage({
      'lumen.preferences.v1': '{"theme":"dark"}',
      'lumen.sidebar.private.dismissed': '1',
      'lumen.account-id.subject-1': '7',
    })

    clearUserScopedData(storage)

    expect(storage.getItem('lumen.preferences.v1')).toBe('{"theme":"dark"}')
    expect(storage.getItem('lumen.sidebar.private.dismissed')).toBe('1')
    expect(storage.getItem('lumen.account-id.subject-1')).toBeNull()
  })
})
