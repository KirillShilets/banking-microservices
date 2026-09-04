import { keycloak } from './keycloak'

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

export async function logout(): Promise<void> {
    await keycloak.logout({
        redirectUri: window.location.origin,
    })
}