package org.bank.notification.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.messaging.RabbitTopology;
import org.bank.notification.service.NotificationService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationCommandListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitTopology.NOTIFICATION_DEPOSIT_QUEUE)
    public void handleNotificationCommand(DepositRequestDTO request) {
        if (request == null || request.billId() == null || request.amount() == null || request.email() == null) {
            log.warn("Skipped invalid notification command payload");
            return;
        }

        try {
            notificationService.sendDepositNotification(request);
        } catch (RuntimeException ex) {
            log.error("Failed to process notification command for billId={}", request.billId(), ex);
        }
    }
}
