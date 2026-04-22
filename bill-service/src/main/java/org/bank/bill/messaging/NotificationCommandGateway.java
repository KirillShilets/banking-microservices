package org.bank.bill.messaging;

import org.bank.dto.request.DepositRequestDTO;

public interface NotificationCommandGateway {
    void sendDepositNotification(DepositRequestDTO requestDTO);
}
