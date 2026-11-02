import { appConfig } from '../config'
import { demoAccessToken } from './demo-session'
import { AuthenticationRequiredError } from './errors'
import { keycloak } from './keycloak'

export async function getAccessToken(): Promise<string> {
  if (appConfig.demoMode) {
    return demoAccessToken()
  }

  if (!keycloak.authenticated || !keycloak.token) {
    throw new AuthenticationRequiredError('Сессия не инициализирована')
  }

  try {
    await keycloak.updateToken(30)
  } catch {
    throw new AuthenticationRequiredError('Не удалось продлить сессию')
  }

  if (!keycloak.token) {
    throw new AuthenticationRequiredError('Токен доступа недоступен')
  }

  return keycloak.token
}

/** Used once after a 401 before the UI reports an expired session. */
export async function forceRefreshAccessToken(): Promise<string> {
  if (appConfig.demoMode) {
    return demoAccessToken()
  }

  if (!keycloak.authenticated) {
    throw new AuthenticationRequiredError('Сессия не инициализирована')
  }

  await keycloak.updateToken(-1)

  if (!keycloak.token) {
    throw new AuthenticationRequiredError('Токен доступа недоступен')
  }

  return keycloak.token
}
