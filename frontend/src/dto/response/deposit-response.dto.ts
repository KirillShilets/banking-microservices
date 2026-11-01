import type { DecimalValue } from '../../types/money'

export interface DepositResponseDTO {
  billId: number
  amount: DecimalValue
  email: string
  creationDate: string
}
