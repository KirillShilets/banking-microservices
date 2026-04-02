import { apiRequest } from '../core'
import type { DepositRequestDTO } from '../../dto/request'
import type { DepositResponseDTO } from '../../dto/response'

export const depositsApi = {
  createDeposit: (payload: DepositRequestDTO) =>
    apiRequest.post<DepositResponseDTO, DepositRequestDTO>('/deposits', payload),

  getDeposit: (depositId: number) =>
    apiRequest.get<DepositResponseDTO>(`/deposits/${depositId}`),
}
