export interface CreateBillRequestDTO {
  amount: string
  overdraftEnabled: boolean
}

export interface BillRequestDTO {
  accountId: number
  amount: string
  overdraftEnabled: boolean
}
