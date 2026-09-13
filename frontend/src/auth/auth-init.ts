import { keycloak } from './keycloak'

let initializationPromise: Promise<boolean> | undefined

export function initAuth(): Promise<boolean> {
    if (!initializationPromise) {
        initializationPromise = keycloak.init({
            onLoad: 'login-required',
            pkceMethod: 'S256',
            checkLoginIframe: false,
        })
    }

    return initializationPromise
}