import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '../../api/modules'
import { ApiError } from '../../api/core'
import { queryKeys } from '../../api/query-keys'
import { getRememberedAccountId, rememberAccountId } from '../../auth/account-link'
import { DEMO_ACCOUNT_ID } from '../../auth/demo-session'
import { isStaff, useAuthUser } from '../../auth'
import type { AccountResponseDTO } from '../../dto/response'

interface AccountContextValue {
  account: AccountResponseDTO | null
  accountId: number | null
  isLoading: boolean
  isAccountMissing: boolean
  /** The profile exists, but this device has not linked an account id yet. */
  needsAccountLink: boolean
  error: Error | null
  linkAccount: (accountId: number) => Promise<void>
  setAccountId: (accountId: number) => void
  refetch: () => Promise<unknown>
}

const AccountContext = createContext<AccountContextValue | null>(null)

function isNotFound(error: Error | null): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * Resolves the authenticated customer's account profile and the numeric account
 * id used by the bills API.
 *
 * Backend note: `GET /accounts/me` intentionally returns profile fields only,
 * without the database id. New accounts are linked when they are created; an
 * existing profile on a fresh device can be linked once by its account number.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const user = useAuthUser()

  const query = useQuery({
    queryKey: queryKeys.account.me(),
    queryFn: accountsApi.getCurrentAccount,
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 1
    },
  })

  const [accountId, setAccountIdState] = useState<number | null>(() => {
    const remembered = getRememberedAccountId(user.subject)
    if (remembered) return remembered

    if (user.isDemo) {
      // Persist the demo link immediately so a page refresh keeps the account.
      rememberAccountId(user.subject, DEMO_ACCOUNT_ID)
      return DEMO_ACCOUNT_ID
    }

    return null
  })

  const setAccountId = useCallback(
    (nextAccountId: number) => {
      if (!Number.isSafeInteger(nextAccountId) || nextAccountId <= 0) {
        throw new Error('Некорректный номер счёта')
      }

      rememberAccountId(user.subject, nextAccountId)
      setAccountIdState(nextAccountId)
    },
    [user.subject],
  )

  const linkAccount = useCallback(
    async (nextAccountId: number) => {
      // Verify the id before persisting it. A pure customer may only link an
      // account whose owner subject matches their Keycloak subject.
      const candidate = await accountsApi.getAccount(nextAccountId)

      if (!isStaff(user) && candidate.ownerSubject) {
        if (candidate.ownerSubject !== user.subject) {
          throw new Error('Этот счёт принадлежит другому клиенту')
        }
      }

      setAccountId(nextAccountId)
    },
    [setAccountId, user],
  )

  const account = query.data ?? null
  const queryError = query.error
  const isPending = query.isPending
  const refetch = query.refetch

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      accountId,
      isLoading: isPending,
      isAccountMissing: isNotFound(queryError),
      needsAccountLink: Boolean(account) && accountId === null,
      error: queryError,
      linkAccount,
      setAccountId,
      refetch: async () => refetch(),
    }),
    [
      account,
      accountId,
      isPending,
      linkAccount,
      queryError,
      refetch,
      setAccountId,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext)

  if (!context) {
    throw new Error('useAccount must be used inside AccountProvider')
  }

  return context
}
