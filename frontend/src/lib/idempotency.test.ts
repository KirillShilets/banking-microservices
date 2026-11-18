import { afterEach, describe, expect, it, vi } from 'vitest'
import { newIdempotencyKey, nextIntent, type IdempotencyIntent } from './idempotency'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function fillWith(value: number) {
  return <T extends ArrayBufferView>(array: T): T => {
    new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(value)
    return array
  }
}

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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a different value for every call', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })

  it('returns a non-empty string', () => {
    expect(newIdempotencyKey().length).toBeGreaterThan(8)
  })

  it('uses crypto.randomUUID when it is available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '11111111-2222-4333-8444-555555555555',
      getRandomValues: vi.fn(),
    })

    expect(newIdempotencyKey()).toBe('11111111-2222-4333-8444-555555555555')
  })

  it('builds an RFC 4122 v4 UUID from getRandomValues outside secure contexts', () => {
    const getRandomValues = vi.fn(fillWith(0xff))
    vi.stubGlobal('crypto', { getRandomValues })

    const key = newIdempotencyKey()

    expect(getRandomValues).toHaveBeenCalledTimes(1)
    expect(key).toMatch(UUID_V4)
    // version nibble forced to 4, variant bits forced to 10xx
    expect(key).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })

  it('sets version and variant bits even for all-zero random input', () => {
    vi.stubGlobal('crypto', { getRandomValues: vi.fn(fillWith(0x00)) })

    expect(newIdempotencyKey()).toBe('00000000-0000-4000-8000-000000000000')
  })

  it('refuses to create a predictable key when no secure random source exists', () => {
    vi.stubGlobal('crypto', undefined)

    expect(() => newIdempotencyKey()).toThrow('No secure random source')
  })
})