export interface RuntimeConfig {
  keycloakUrl: string
  keycloakRealm: string
  keycloakClientId: string
  gatewayUrl: string
  /** Local demo session instead of a Keycloak redirect. Never enable in production. */
  demoMode: boolean
  /** Starts MSW and serves the banking API from the in-browser mock backend. */
  mockApi: boolean
}

type RuntimeOverride = Record<string, unknown>

declare global {
  interface Window {
    /**
     * Runtime config injected by /config.js (Helm/ConfigMap).
     * Both the camelCase frontend contract and the uppercase Helm keys are
     * accepted so the image stays compatible with existing deployments.
     */
    __APP_CONFIG__?: RuntimeOverride
  }
}

const RUNTIME_KEYS = {
  keycloakUrl: ['keycloakUrl', 'KEYCLOAK_URL'],
  keycloakRealm: ['keycloakRealm', 'KEYCLOAK_REALM'],
  keycloakClientId: ['keycloakClientId', 'KEYCLOAK_CLIENT_ID'],
  gatewayUrl: ['gatewayUrl', 'GATEWAY_URL'],
  demoMode: ['demoMode', 'DEMO_MODE'],
  mockApi: ['mockApi', 'MOCK_API', 'ENABLE_MOCKS'],
} as const

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

function readRuntimeString(
  source: RuntimeOverride | undefined,
  keys: readonly string[],
  fallback: string,
): string {
  if (!source) return fallback

  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return fallback
}

function readRuntimeBoolean(
  source: RuntimeOverride | undefined,
  keys: readonly string[],
  fallback: boolean,
): boolean {
  if (!source) return fallback

  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
    if (value === 'true' || value === '1') return true
    if (value === 'false' || value === '0') return false
  }

  return fallback
}

const environment = import.meta.env

/**
 * Demo sessions and the in-browser mock API exist only for local review. The
 * flag is combined with the compile-time DEV constant so a production build
 * evaluates it to false and the guarded code paths are eliminated
 * instead of being shipped and merely left disabled at runtime.
 */
const developmentOnly = import.meta.env.DEV

const defaults: RuntimeConfig = {
  keycloakUrl: environment.VITE_KEYCLOAK_URL ?? 'http://keycloak.localhost',
  keycloakRealm: environment.VITE_KEYCLOAK_REALM ?? 'bank-realm',
  keycloakClientId: environment.VITE_KEYCLOAK_CLIENT_ID ?? 'banking-frontend',
  gatewayUrl: environment.VITE_GATEWAY_URL ?? 'http://api.localhost',
  demoMode: readBoolean(environment.VITE_DEMO_MODE, false),
  mockApi: readBoolean(environment.VITE_ENABLE_MOCKS, false),
}

const runtime: RuntimeOverride | undefined =
  typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined

export const appConfig: RuntimeConfig = {
  keycloakUrl: readRuntimeString(
    runtime,
    RUNTIME_KEYS.keycloakUrl,
    defaults.keycloakUrl,
  ),
  keycloakRealm: readRuntimeString(
    runtime,
    RUNTIME_KEYS.keycloakRealm,
    defaults.keycloakRealm,
  ),
  keycloakClientId: readRuntimeString(
    runtime,
    RUNTIME_KEYS.keycloakClientId,
    defaults.keycloakClientId,
  ),
  gatewayUrl: readRuntimeString(
    runtime,
    RUNTIME_KEYS.gatewayUrl,
    defaults.gatewayUrl,
  ),
  demoMode:
    developmentOnly &&
    readRuntimeBoolean(runtime, RUNTIME_KEYS.demoMode, defaults.demoMode),
  mockApi:
    developmentOnly &&
    readRuntimeBoolean(runtime, RUNTIME_KEYS.mockApi, defaults.mockApi),
}

export function pick<T extends keyof RuntimeConfig>(
  obj: Partial<RuntimeConfig>,
  ...keys: T[]
): Pick<Partial<RuntimeConfig>, T> {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key]
    return acc
  }, {} as Pick<Partial<RuntimeConfig>, T>)
}

export function withoutTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}