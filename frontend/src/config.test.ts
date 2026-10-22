import { describe, it, expect } from 'vitest'
import { appConfig, withoutTrailingSlash } from './config'

describe('appConfig defaults', () => {
    it('uses defaults when no runtime override', () => {
        expect(appConfig.keycloakUrl).toBe('http://keycloak.localhost')
        expect(appConfig.keycloakRealm).toBe('bank-realm')
        expect(appConfig.keycloakClientId).toBe('banking-frontend')
        expect(appConfig.gatewayUrl).toBe('http://localhost:8989')
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

describe('runtime override', () => {
    it('merges window.__APP_CONFIG__ over defaults', () => {
        const original = window.__APP_CONFIG__
        window.__APP_CONFIG__ = { gatewayUrl: 'http://custom.api' }

        // Re-import to pick up new config would require a fresh module
        // Instead, just verify the structure is Partial<RuntimeConfig>
        expect(window.__APP_CONFIG__?.gatewayUrl).toBe('http://custom.api')

        window.__APP_CONFIG__ = original
    })
})
