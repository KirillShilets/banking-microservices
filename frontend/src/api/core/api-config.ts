export const DEFAULT_GATEWAY_URL = 'http://localhost:8989'

export const API_BASE_URL =
  import.meta.env.VITE_GATEWAY_URL?.trim() || DEFAULT_GATEWAY_URL

export const API_TIMEOUT_MS = 12_000
