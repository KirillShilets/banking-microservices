import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, billsApi } from '../../api/modules'
import { queryKeys } from '../../api/query-keys'
import type {
  AccountRequestDTO,
  CreateBillRequestDTO,
  UpdateAccountRequestDTO,
} from '../../dto/request'
import type { SandboxDepositRequest } from '../../api/modules/bills.api'

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AccountRequestDTO) => accountsApi.createAccount(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.all })
    },
  })
}

export function useUpdateAccount(accountId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateAccountRequestDTO) => {
      if (accountId === null) {
        throw new Error('Счёт не привязан к профилю')
      }
      return accountsApi.updateAccount(accountId, payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.all })
    },
  })
}

export function useOpenBill(accountId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bills: CreateBillRequestDTO[]) => {
      if (accountId === null) {
        throw new Error('Счёт не привязан к профилю')
      }
      return billsApi.createBillsForAccount(accountId, bills)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bills.all })
    },
  })
}

export function useSandboxDeposit(accountId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SandboxDepositRequest) => billsApi.depositBill(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bills.all })
      if (accountId !== null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.bills.byAccount(accountId),
        })
      }
    },
  })
}
