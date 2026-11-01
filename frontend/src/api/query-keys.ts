export const queryKeys = {
  account: {
    all: ['account'] as const,
    me: () => [...queryKeys.account.all, 'me'] as const,
  },
  bills: {
    all: ['bills'] as const,
    byAccount: (accountId: number) =>
      [...queryKeys.bills.all, 'account', accountId] as const,
    detail: (billId: number) => [...queryKeys.bills.all, 'detail', billId] as const,
  },
  deposits: {
    all: ['deposits'] as const,
    detail: (depositId: number) =>
      [...queryKeys.deposits.all, 'detail', depositId] as const,
  },
}
