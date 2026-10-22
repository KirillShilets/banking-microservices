import { afterEach, describe, expect, it, vi } from 'vitest'

describe('api-config', () => {
    const original = window.__APP_CONFIG__

    afterEach(() => {
        window.__APP_CONFIG__ = original
        vi.resetModules()
    })

    it('defaults to the local gateway URL when no runtime override is set', async () => {
        window.__APP_CONFIG__ = undefined
        const { API_BASE_URL, API_TIMEOUT_MS } = await import('./api-config')
        expect(API_BASE_URL).toBe('http://localhost:8989')
        expect(API_TIMEOUT_MS).toBe(12_000)
    })

    it('uses the runtime gateway URL when configured', async () => {
        window.__APP_CONFIG__ = { gatewayUrl: 'https://gateway.example.com/' }
        const { API_BASE_URL } = await import('./api-config')
        expect(API_BASE_URL).toBe('https://gateway.example.com/')
    })
})
