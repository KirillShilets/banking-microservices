package org.bank.account.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.messaging.BillCommandGateway;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxMessageProcessor {

    private static final int MAX_RETRIES = 5;

    private final OutboxRepository outboxRepository;
    private final BillCommandGateway billCommandGateway;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(UUID messageId) {
        OutboxMessage message = outboxRepository
                .findByIdForUpdate(messageId)
                .orElse(null);

        if (message == null) {
            log.debug(
                    "Outbox message id={} was already removed",
                    messageId
            );
            return;
        }

        if (message.getStatus() != OutboxStatus.PENDING) {
            log.debug(
                    "Skipping outbox message id={} because its status is {}",
                    messageId,
                    message.getStatus()
            );
            return;
        }

        try {
            log.info(
                    "Dispatching outbox message: id={}, eventType={}",
                    message.getId(),
                    message.getEventType()
            );

            dispatch(message);

            message.setStatus(OutboxStatus.SENT);
            message.setSentAt(OffsetDateTime.now());
            message.setErrorMessage(null);

            outboxRepository.save(message);

            log.info(
                    "Successfully published outbox message id={}",
                    message.getId()
            );
        } catch (Exception exception) {
            handleFailure(message, exception);
        }
    }

    private void dispatch(OutboxMessage message) throws Exception {
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
    }

    private void handleFailure(
            OutboxMessage message,
            Exception exception
    ) {
        log.error(
                "Failed to publish outbox message id={}. Retrying later...",
                message.getId(),
                exception
        );

        int retries = message.getRetryCount() + 1;

        message.setRetryCount(retries);
        message.setErrorMessage(resolveErrorMessage(exception));

        if (retries >= MAX_RETRIES) {
            message.setStatus(OutboxStatus.FAILED);

            log.error(
                    "Message id={} exceeded max retries. "
                            + "Setting status to FAILED.",
                    message.getId()
            );
        } else {
            message.setStatus(OutboxStatus.PENDING);
        }

        outboxRepository.save(message);
    }

    private String resolveErrorMessage(Exception exception) {
        String message = exception.getMessage();

        if (message != null && !message.isBlank()) {
            return message;
        }

        return exception.getClass().getSimpleName();
    }
}