import { useQuery } from '@tanstack/react-query'
import { billsApi } from '../../api/modules'
import { queryKeys } from '../../api/query-keys'
import { useAccount } from '../account/AccountProvider'
import { sumMoney } from '../../lib/money'
import type { BillResponseDTO } from '../../dto/response'

export function useBills() {
  const { accountId, isAccountMissing } = useAccount()

  return useQuery({
    queryKey: queryKeys.bills.byAccount(accountId ?? 0),
    queryFn: () => {
      if (accountId === null) {
        throw new Error('Счёт не привязан к профилю')
      }
      return billsApi.getBillsByAccount(accountId)
    },
    enabled: accountId !== null && !isAccountMissing,
    staleTime: 20_000,
  })
}

export interface BillsSummary {
  total: bigint
  defaultBill: BillResponseDTO | null
  savingsBills: BillResponseDTO[]
  overdraftBills: BillResponseDTO[]
}

export function summariseBills(bills: BillResponseDTO[]): BillsSummary {
  const defaultBill = bills.find((bill) => bill.isDefault) ?? bills[0] ?? null
  const savingsBills = bills.filter((bill) => bill.billId !== defaultBill?.billId)

  return {
    total: sumMoney(bills.map((bill) => bill.amount)),
    defaultBill,
    savingsBills,
    overdraftBills: bills.filter((bill) => bill.overdraftEnabled),
  }
}

export function useBillsSummary(): BillsSummary {
  const query = useBills()
  return summariseBills(query.data ?? [])
}
