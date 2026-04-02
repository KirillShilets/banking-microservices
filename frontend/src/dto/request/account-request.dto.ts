import type { CreateBillRequestDTO } from './bill-request.dto'

export interface AccountRequestDTO {
  name: string
  email: string
  phone: string
  bills: CreateBillRequestDTO[]
}

export interface UpdateAccountRequestDTO {
  name: string
  email: string
  phone: string
}
