import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { appConfig } from '../config'
import { clearUserScopedData } from '../lib/user-data'
import { createDemoUser, setDemoRole } from './demo-session'
import { keycloak } from './keycloak'
import type { AuthBootstrapResult } from './bootstrap'
import { subscribeUnauthorized } from './unauthorized'
import type { AuthContextValue, AuthUser, BankRole } from './types'

interface AuthProviderProps {
  bootstrap: AuthBootstrapResult
  children: ReactNode
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ bootstrap, children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(bootstrap.user)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(
    () =>
      subscribeUnauthorized(() => {
        setSessionExpired(true)
      }),
    [],
  )

  const login = useCallback(async () => {
    if (appConfig.demoMode) {
      setUser(createDemoUser())
      setSessionExpired(false)
      return
    }

    await keycloak.login({ redirectUri: window.location.origin })
  }, [])

  const logout = useCallback(async () => {
    clearUserScopedData()

    if (appConfig.demoMode) {
      setUser(null)
      setSessionExpired(false)
      return
    }

    await keycloak.logout({ redirectUri: window.location.origin })
  }, [])

  const switchDemoRole = useCallback((role: BankRole) => {
    if (!appConfig.demoMode) return

    setDemoRole(role)
    setUser(createDemoUser(role))
    setSessionExpired(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      mode: bootstrap.mode,
      sessionExpired,
      login,
      logout,
      switchDemoRole,
    }),
    [bootstrap.mode, login, logout, sessionExpired, switchDemoRole, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}

export function useAuthUser(): AuthUser {
  const { user } = useAuth()

  if (!user) {
    throw new Error('Authenticated user is required for this screen')
  }

  return user
}
