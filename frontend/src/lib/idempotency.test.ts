import { describe, expect, it } from 'vitest'
import { newIdempotencyKey, nextIntent, type IdempotencyIntent } from './idempotency'

describe('nextIntent', () => {
  it('keeps the key while the intent does not change', () => {
    const first = nextIntent(null, '1|10.00', () => 'key-1')

    expect(first.key).toBe('key-1')
    expect(nextIntent(first, '1|10.00', () => 'key-2')).toBe(first)
  })

  it('issues a new key when the payload changes', () => {
    const first: IdempotencyIntent = { signature: '1|10.00', key: 'key-1' }

    const second = nextIntent(first, '1|20.00', () => 'key-2')

    expect(second.key).toBe('key-2')
    expect(second.signature).toBe('1|20.00')
  })
})

describe('newIdempotencyKey', () => {
  it('returns a different value for every call', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })

  it('returns a non-empty string', () => {
    expect(newIdempotencyKey().length).toBeGreaterThan(8)
  })
})
