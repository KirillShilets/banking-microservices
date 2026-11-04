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

export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  // Only reachable in environments without Web Crypto (old jsdom, insecure
  // context); the key still has to be unique per submission.
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
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
