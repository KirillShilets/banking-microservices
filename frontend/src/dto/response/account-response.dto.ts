export interface AccountResponseDTO {
  name: string
  email: string
  phone: string
  creationDate: string
}

export interface UpdateAccountResponseDTO {
  accountId: number
  name: string
  email: string
  phone: string
}
