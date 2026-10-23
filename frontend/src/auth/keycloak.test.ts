import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const constructed: Array<Record<string, unknown>> = []

vi.mock('keycloak-js', () => ({
    default: class {
        constructor(config: Record<string, unknown>) {
            constructed.push(config)
        }
    },
}))

describe('keycloak client configuration', () => {
    const original = window.__APP_CONFIG__

    beforeEach(() => {
        constructed.length = 0
    })

    afterEach(() => {
        window.__APP_CONFIG__ = original
        vi.resetModules()
    })

    it('is constructed from the runtime app config', async () => {
        window.__APP_CONFIG__ = {
            keycloakUrl: 'https://sso.example.com/auth',
            keycloakRealm: 'custom-realm',
            keycloakClientId: 'custom-client',
        }
        const mod = await import('./keycloak')
        expect(constructed).toHaveLength(1)
        expect(constructed[0]).toEqual({
            url: 'https://sso.example.com/auth',
            realm: 'custom-realm',
            clientId: 'custom-client',
        })
        expect(mod.keycloak).toBeDefined()
    })
})
