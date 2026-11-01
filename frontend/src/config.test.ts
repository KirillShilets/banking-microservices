import { afterEach, describe, expect, it, vi } from 'vitest'
import { appConfig, pick, withoutTrailingSlash } from './config'

const originalRuntimeConfig = window.__APP_CONFIG__

afterEach(() => {
  window.__APP_CONFIG__ = originalRuntimeConfig
  vi.resetModules()
})

describe('appConfig defaults', () => {
  it('uses defaults when no runtime override', () => {
    expect(appConfig.keycloakUrl).toBe('http://keycloak.localhost')
    expect(appConfig.keycloakRealm).toBe('bank-realm')
    expect(appConfig.keycloakClientId).toBe('banking-frontend')
    expect(appConfig.gatewayUrl).toBe('http://api.localhost')
  })
})

describe('withoutTrailingSlash', () => {
  it('removes trailing slash', () => {
    expect(withoutTrailingSlash('http://localhost/')).toBe('http://localhost')
  })

  it('returns value unchanged when no trailing slash', () => {
    expect(withoutTrailingSlash('http://localhost')).toBe('http://localhost')
  })
})

describe('pick', () => {
  it('returns only the requested keys from a partial config', () => {
    const picked = pick({ gatewayUrl: 'http://g', keycloakRealm: 'r' }, 'gatewayUrl')
    expect(picked).toEqual({ gatewayUrl: 'http://g' })
    expect('keycloakRealm' in picked).toBe(false)
  })

  it('skips keys that are absent from the source object', () => {
    const picked = pick({ gatewayUrl: 'http://g' }, 'keycloakUrl', 'gatewayUrl')
    expect(picked).toEqual({ gatewayUrl: 'http://g' })
  })

  it('returns an empty object when no keys are requested', () => {
    expect(pick({ gatewayUrl: 'http://g' })).toEqual({})
  })
})

describe('runtime override', () => {
  it('reads camelCase runtime keys', async () => {
    window.__APP_CONFIG__ = {
      gatewayUrl: 'http://custom.api',
      mockApi: true,
      demoMode: 'true',
    }

    const { appConfig: runtimeConfig } = await import('./config')
    expect(runtimeConfig.gatewayUrl).toBe('http://custom.api')
    expect(runtimeConfig.mockApi).toBe(true)
    expect(runtimeConfig.demoMode).toBe(true)
  })

  it('reads Helm-style uppercase runtime keys', async () => {
    window.__APP_CONFIG__ = {
      KEYCLOAK_URL: 'https://sso.example.com',
      KEYCLOAK_REALM: 'custom-realm',
      KEYCLOAK_CLIENT_ID: 'custom-client',
      GATEWAY_URL: 'https://api.example.com',
      DEMO_MODE: 'false',
    }

    const { appConfig: runtimeConfig } = await import('./config')
    expect(runtimeConfig.keycloakUrl).toBe('https://sso.example.com')
    expect(runtimeConfig.keycloakRealm).toBe('custom-realm')
    expect(runtimeConfig.keycloakClientId).toBe('custom-client')
    expect(runtimeConfig.gatewayUrl).toBe('https://api.example.com')
    expect(runtimeConfig.demoMode).toBe(false)
  })
})
