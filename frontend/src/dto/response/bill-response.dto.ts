export interface BillResponseDTO {
  billId: number
  accountId: number
  amount: number
  isDefault: boolean
  creationDate: string
  overdraftEnabled: boolean
}

export interface BillDepositResponseDTO {
  billId: number
  accountId: number
  amount: number
  email: string
  isDefault: boolean
  overdraftEnabled: boolean
  creationDate: string
}
