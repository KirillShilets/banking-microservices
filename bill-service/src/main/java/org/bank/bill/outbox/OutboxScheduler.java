package org.bank.bill.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.bill.messaging.DepositCommandGateway;
import org.bank.bill.messaging.NotificationCommandGateway;
import org.bank.dto.request.DepositRequestDTO;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxScheduler {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_RETRIES = 5;

    private final OutboxRepository outboxRepository;
    private final DepositCommandGateway depositCommandGateway;
    private final NotificationCommandGateway notificationCommandGateway;
    private final ObjectMapper objectMapper;

    @Transactional
    @Scheduled(fixedDelayString = "${app.outbox.scheduler.fixed-delay:1000}")
    public void processOutbox() {
        List<OutboxMessage> messages = outboxRepository.findPendingMessagesWithLock(BATCH_SIZE);
        for (OutboxMessage message : messages) {
            processSingleMessage(message);
        }
    }

    private void processSingleMessage(OutboxMessage message) {
        try {
            DepositRequestDTO request = objectMapper.readValue(message.getPayload(), DepositRequestDTO.class);
            switch (message.getEventType()) {
                case "DEPOSIT_CREATED" -> depositCommandGateway.saveDeposit(request);
                case "NOTIFICATION_CREATED" -> notificationCommandGateway.sendDepositNotification(request);
                default -> throw new IllegalStateException("Unknown outbox event type: " + message.getEventType());
            }
            message.setStatus(OutboxStatus.SENT);
            message.setSentAt(OffsetDateTime.now());
            message.setErrorMessage(null);
        } catch (Exception ex) {
            int retries = message.getRetryCount() + 1;
            message.setRetryCount(retries);
            message.setErrorMessage(ex.getMessage());
            if (retries >= MAX_RETRIES) {
                message.setStatus(OutboxStatus.FAILED);
            }
        }
        outboxRepository.save(message);
    }
}
