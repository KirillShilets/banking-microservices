package org.bank.notification.service;

import org.bank.dto.response.NotificationResponseDTO;
import org.bank.notification.controller.dto.DepositNotificationRequestDTO;

public interface NotificationService {
    NotificationResponseDTO sendDepositNotification(DepositNotificationRequestDTO requestDTO);
}
