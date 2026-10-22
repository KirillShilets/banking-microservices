export interface RuntimeConfig {
    keycloakUrl: string
    keycloakRealm: string
    keycloakClientId: string
    gatewayUrl: string
}

declare global {
    interface Window {
        __APP_CONFIG__?: Partial<RuntimeConfig>
    }
}

const defaults: RuntimeConfig = {
    keycloakUrl: 'http://keycloak.localhost',
    keycloakRealm: 'bank-realm',
    keycloakClientId: 'banking-frontend',
    gatewayUrl: 'http://localhost:8989',
}

export const appConfig: RuntimeConfig = {
    ...defaults,
    ...(typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined),
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
