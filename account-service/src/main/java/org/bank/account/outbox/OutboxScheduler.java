package org.bank.account.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.messaging.BillCommandGateway;
import org.bank.messaging.dto.CreateBillsCommandDTO;
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
    private final BillCommandGateway billCommandGateway;
    private final ObjectMapper objectMapper;

    @Transactional
    @Scheduled(fixedDelayString = "${app.outbox.scheduler.fixed-delay:1000}")
    public void processOutbox() {
        List<OutboxMessage> messages =
                outboxRepository.findPendingMessagesWithLock(BATCH_SIZE);

        if (messages.isEmpty()) {
            return;
        }

        log.debug(
                "Found {} pending outbox messages to process",
                messages.size()
        );

        for (OutboxMessage message : messages) {
            processSingleMessage(message);
        }
    }

    public void processSingleMessage(OutboxMessage message) {
        try {
            log.info(
                    "Dispatching outbox message: id={}, eventType={}",
                    message.getId(),
                    message.getEventType()
            );

            switch (message.getEventType()) {
                case "ACCOUNT_CREATED" -> {
                    CreateBillsCommandDTO command =
                            objectMapper.readValue(
                                    message.getPayload(),
                                    CreateBillsCommandDTO.class
                            );

                    billCommandGateway.createBillsForAccount(command);
                }
                default -> throw new IllegalStateException(
                        "Unknown outbox event type: "
                                + message.getEventType()
                );
            }

            message.setStatus(OutboxStatus.SENT);
            message.setSentAt(OffsetDateTime.now());
            message.setErrorMessage(null);

            outboxRepository.save(message);

            log.info(
                    "Successfully published outbox message id={}",
                    message.getId()
            );
        } catch (Exception exception) {
            log.error(
                    "Failed to publish outbox message id={}. Retrying later...",
                    message.getId(),
                    exception
            );

            int retries = message.getRetryCount() + 1;

            message.setRetryCount(retries);
            message.setErrorMessage(exception.getMessage());

            if (retries >= MAX_RETRIES) {
                log.error(
                        "Message id={} exceeded max retries. "
                                + "Setting status to FAILED.",
                        message.getId()
                );

                message.setStatus(OutboxStatus.FAILED);
            }

            outboxRepository.save(message);
        }
    }
}