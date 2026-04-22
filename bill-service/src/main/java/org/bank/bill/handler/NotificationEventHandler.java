package org.bank.bill.handler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.bill.handler.event.NotificationEvent;
import org.bank.bill.messaging.NotificationCommandGateway;
import org.bank.dto.request.DepositRequestDTO;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventHandler {
    private final NotificationCommandGateway notificationCommandGateway;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNotificationEvent(NotificationEvent event) {
        log.info("Received notification event");
        try {
            notificationCommandGateway.sendDepositNotification(new DepositRequestDTO(event.billId(), event.amount(), event.email()));
            log.info("Successfully sent notification info to NotificationService");
        } catch (Exception e) {
            log.error("Failed to sync notification to NotificationService. Error: {}", e.getMessage());
        }
    }
}
