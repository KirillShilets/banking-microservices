type UnauthorizedListener = () => void

const unauthorizedListeners = new Set<UnauthorizedListener>()

export function emitUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    listener()
  }
}

export function subscribeUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}
