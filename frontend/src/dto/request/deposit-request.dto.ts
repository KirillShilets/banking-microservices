import type { DecimalValue } from '../../types/money'

export interface DepositRequestDTO {
  billId: number
  amount: DecimalValue
  email: string
}
