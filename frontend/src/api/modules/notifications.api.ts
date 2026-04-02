import { apiRequest } from '../core'
import type { DepositRequestDTO } from '../../dto/request'
import type { NotificationResponseDTO } from '../../dto/response'

export const notificationsApi = {
  sendDepositNotification: (payload: DepositRequestDTO) =>
    apiRequest.post<NotificationResponseDTO, DepositRequestDTO>(
      '/notifications/deposits',
      payload,
    ),
}
