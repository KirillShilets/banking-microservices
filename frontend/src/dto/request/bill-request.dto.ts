export interface CreateBillRequestDTO {
  amount: number
  overdraftEnabled: boolean
}

export interface BillRequestDTO {
  accountId: number
  amount: number
  overdraftEnabled: boolean
}
