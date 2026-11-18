/**
 * Idempotency keys for money-moving requests.
 *
 * The key must follow the user's *intent*, not the network call: a retry of the
 * same form submission has to reuse the key (so the server replays instead of
 * crediting twice), while an edited amount is a new intent and needs a new key
 * (otherwise the server answers 422 for a reused key with a different payload).
 */
export interface IdempotencyIntent {
  readonly signature: string
  readonly key: string
}

function uuidV4FromRandomValues(cryptoApi: Crypto): string {
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))

  // RFC 4122: version 4, variant 10xx.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  // randomUUID() is limited to secure contexts; getRandomValues() is not, and
  // it is still a cryptographically strong source.
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    return uuidV4FromRandomValues(cryptoApi)
  }

  // Never fall back to a predictable key for a money-moving request.
  throw new Error('No secure random source available to create an idempotency key')
}

export function nextIntent(
    current: IdempotencyIntent | null,
    signature: string,
    generate: () => string = newIdempotencyKey,
): IdempotencyIntent {
  if (current !== null && current.signature === signature) {
    return current
  }

  return { signature, key: generate() }
}