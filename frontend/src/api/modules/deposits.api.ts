import { apiRequest } from '../core'
import type { DepositResponseDTO } from '../../dto/response'

export const depositsApi = {
  getDeposit: (depositId: number) =>
    apiRequest.get<DepositResponseDTO>(`/deposits/${depositId}`),
}
