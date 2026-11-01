import type { DecimalValue } from '../../types/money'

export type ActivityKind = 'deposit' | 'payment' | 'transfer' | 'income' | 'subscription'

export type ActivityCategory =
  | 'income'
  | 'groceries'
  | 'transport'
  | 'subscriptions'
  | 'transfer'
  | 'cash'
  | 'topup'
  | 'other'

export type ActivityStatus = 'completed' | 'pending' | 'failed'

export interface Activity {
  id: string
  kind: ActivityKind
  title: string
  counterparty: string
  amount: string
  billId: number
  createdAt: string
  status: ActivityStatus
  category: ActivityCategory
}

export interface NewActivity {
  kind: ActivityKind
  title: string
  counterparty: string
  amount: DecimalValue
  billId: number
  status?: ActivityStatus
  category: ActivityCategory
}
