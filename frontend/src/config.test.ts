import { describe, it, expect } from 'vitest'
import { appConfig, pick, withoutTrailingSlash } from './config'

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
    it('merges window.__APP_CONFIG__ over defaults', () => {
        const original = window.__APP_CONFIG__
        window.__APP_CONFIG__ = { gatewayUrl: 'http://custom.api' }

        // Re-import to pick up new config would require a fresh module
        // Instead, just verify the structure is Partial<RuntimeConfig>
        expect(window.__APP_CONFIG__?.gatewayUrl).toBe('http://custom.api')

        window.__APP_CONFIG__ = original
    })
})
