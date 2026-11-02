import type { DecimalValue } from '../../types/money'

export interface BillResponseDTO {
  billId: number
  accountId: number
  amount: DecimalValue
  isDefault: boolean
  creationDate: string
  overdraftEnabled: boolean
}

export interface BillDepositResponseDTO {
  billId: number
  accountId: number
  amount: DecimalValue
  email: string
  isDefault: boolean
  overdraftEnabled: boolean
  creationDate: string
}
