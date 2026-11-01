import { appConfig } from '../config'
import { keycloak } from './keycloak'
import { createDemoUser } from './demo-session'
import {
  isBankRole,
  primaryRole,
  type AuthMode,
  type AuthUser,
  type BankRole,
} from './types'

export interface AuthBootstrapResult {
  user: AuthUser
  mode: AuthMode
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readRoles(token: Readonly<Record<string, unknown>>): BankRole[] {
  const realmAccess = token.realm_access

  if (typeof realmAccess !== 'object' || realmAccess === null) {
    return []
  }

  const roles = (realmAccess as Record<string, unknown>).roles
  if (!Array.isArray(roles)) return []

  return roles.filter((role): role is BankRole => typeof role === 'string' && isBankRole(role))
}

function buildKeycloakUser(): AuthUser {
  const token = (keycloak.tokenParsed ?? {}) as Readonly<Record<string, unknown>>
  const roles = readRoles(token)
  const username = readString(token.preferred_username)
  const email = readString(token.email)
  const name = readString(token.name)
  const subject = readString(token.sub)

  return {
    subject,
    username: username || email || 'user',
    displayName: name || username || 'Пользователь',
    email,
    roles,
    primaryRole: primaryRole(roles),
    isDemo: false,
  }
}

export async function bootstrapAuth(): Promise<AuthBootstrapResult> {
  if (appConfig.demoMode) {
    return {
      user: createDemoUser(),
      mode: 'demo',
    }
  }

  const authenticated = await keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  })

  if (!authenticated) {
    throw new Error('Keycloak не подтвердил сессию')
  }

  return {
    user: buildKeycloakUser(),
    mode: 'keycloak',
  }
}
