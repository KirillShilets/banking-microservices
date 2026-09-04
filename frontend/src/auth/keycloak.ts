import Keycloak from 'keycloak-js'

const keycloakUrl =
    import.meta.env.VITE_KEYCLOAK_URL?.trim() ||
    'http://keycloak.localhost:8080'

const keycloakRealm =
    import.meta.env.VITE_KEYCLOAK_REALM?.trim() || 'bank-realm'

const keycloakClientId =
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID?.trim() || 'banking-frontend'

export const keycloak = new Keycloak({
    url: keycloakUrl,
    realm: keycloakRealm,
    clientId: keycloakClientId,
})