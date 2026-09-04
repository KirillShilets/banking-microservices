import { keycloak } from './keycloak'

export async function initAuth(): Promise<boolean> {
    try {
        const authenticated = await keycloak.init({
            onLoad: 'login-required',
            pkceMethod: 'S256',
            checkLoginIframe: false,
        })

        return authenticated
    } catch (error) {
        console.error('Keycloak init error', error)
        return false
    }
}