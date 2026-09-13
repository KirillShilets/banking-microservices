import { keycloak } from './keycloak'

export class AuthenticationRequiredError extends Error {
    constructor(message = 'Сессия недоступна. Выполните вход повторно.') {
        super(message)
        this.name = 'AuthenticationRequiredError'
    }
}

let refreshPromise: Promise<string> | undefined
let loginPromise: Promise<void> | undefined

const listeners = new Set<() => void>()
let sessionRevision = 0

function notifySessionChanged(): void {
    sessionRevision += 1

    for (const listener of listeners) {
        listener()
    }
}

keycloak.onAuthSuccess = notifySessionChanged
keycloak.onAuthRefreshSuccess = notifySessionChanged
keycloak.onAuthRefreshError = notifySessionChanged
keycloak.onAuthLogout = notifySessionChanged

export function subscribeSession(listener: () => void): () => void {
    listeners.add(listener)

    return () => {
        listeners.delete(listener)
    }
}

export function getSessionSnapshot(): number {
    return sessionRevision
}

export function realmRoles(): string[] {
    return keycloak.tokenParsed?.realm_access?.roles ?? []
}

export function hasRealmRole(role: string): boolean {
    return realmRoles().includes(role)
}

export function displayName(): string {
    const parsed = keycloak.tokenParsed

    return parsed?.preferred_username ?? parsed?.email ?? 'user'
}

async function refreshAccessToken(): Promise<string> {
    if (!keycloak.authenticated || !keycloak.token) {
        throw new AuthenticationRequiredError()
    }

    try {
        await keycloak.updateToken(30)
    } catch {
        throw new AuthenticationRequiredError(
            'Не удалось обновить сессию. Запрос к API не был отправлен.',
        )
    }

    if (!keycloak.authenticated || !keycloak.token) {
        throw new AuthenticationRequiredError()
    }

    return keycloak.token
}

export function getAccessToken(): Promise<string> {
    if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = undefined
        })
    }

    return refreshPromise
}

export function login(): Promise<void> {
    if (!loginPromise) {
        loginPromise = keycloak.login({
            redirectUri: window.location.origin,
        }).finally(() => {
            loginPromise = undefined
        })
    }

    return loginPromise
}

export async function logout(): Promise<void> {
    await keycloak.logout({
        redirectUri: window.location.origin,
    })
}