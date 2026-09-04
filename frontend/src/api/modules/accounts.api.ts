import { apiRequest } from '../core'
import type {
  AccountRequestDTO,
  UpdateAccountRequestDTO,
} from '../../dto/request'
import type {
  AccountResponseDTO,
  UpdateAccountResponseDTO,
} from '../../dto/response'

export const accountsApi = {
  getAccount: (accountId: number) =>
    apiRequest.get<AccountResponseDTO>(`/accounts/${accountId}`),

  getCurrentAccount: () => apiRequest.get<AccountResponseDTO>('/accounts/me'),

  createAccount: (payload: AccountRequestDTO) =>
    apiRequest.post<number, AccountRequestDTO>('/accounts', payload),

  updateAccount: (accountId: number, payload: UpdateAccountRequestDTO) =>
    apiRequest.put<UpdateAccountResponseDTO, UpdateAccountRequestDTO>(
      `/accounts/${accountId}`,
      payload,
    ),

  deleteAccount: (accountId: number) => apiRequest.delete(`/accounts/${accountId}`),
}
