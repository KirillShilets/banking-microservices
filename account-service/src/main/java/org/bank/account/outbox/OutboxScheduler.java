package org.bank.account.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.messaging.BillCommandGateway;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.bank.messaging.dto.DeleteBillsByAccountCommandDTO;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxScheduler {

    private final OutboxRepository outboxRepository;
    private final BillCommandGateway billCommandGateway;
    private final ObjectMapper objectMapper;

    private static final int BATCH_SIZE = 50;
    private static final int MAX_RETRIES = 5;

    @Transactional
    @Scheduled(fixedDelayString = "${app.outbox.scheduler.fixed-delay:1000}")
    public void processOutbox() {
        List<OutboxMessage> messages = fetchPendingMessages();
        if (messages.isEmpty()) {
            return;
        }

        log.debug("Found {} pending outbox messages to process", messages.size());

        for (OutboxMessage message : messages) {
            processSingleMessage(message);
        }
    }

    public List<OutboxMessage> fetchPendingMessages() {
        return outboxRepository.findPendingMessagesWithLock(BATCH_SIZE);
    }

    public void processSingleMessage(OutboxMessage message) {
        try {
            log.info("Dispatching outbox message: id={}, eventType={}", message.getId(), message.getEventType());

            switch (message.getEventType()) {
                case "ACCOUNT_CREATED" -> {
                    CreateBillsCommandDTO dto = objectMapper.readValue(message.getPayload(), CreateBillsCommandDTO.class);
                    billCommandGateway.createBillsForAccount(dto.accountId(), dto.bills());
                }
                default -> throw new IllegalStateException("Unknown outbox event type: " + message.getEventType());
            }

            message.setStatus(OutboxStatus.SENT);
            message.setSentAt(OffsetDateTime.now());
            message.setErrorMessage(null);
            outboxRepository.save(message);
            log.info("Successfully published outbox message id={}", message.getId());
        } catch (Exception ex) {
            log.error("Failed to publish outbox message id={}. Retrying later...", message.getId(), ex);

            int retries = message.getRetryCount() + 1;
            message.setRetryCount(retries);
            message.setErrorMessage(ex.getMessage());

            if (retries >= MAX_RETRIES) {
                log.error("Message id={} exceeded max retries. Setting status to FAILED.", message.getId());
                message.setStatus(OutboxStatus.FAILED);
            }

            outboxRepository.save(message);
        }
    }
}
