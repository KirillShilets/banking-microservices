package org.bank.notification.service;

import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;

public interface NotificationService {
    NotificationResponseDTO sendDepositNotification(DepositRequestDTO requestDTO);
}
