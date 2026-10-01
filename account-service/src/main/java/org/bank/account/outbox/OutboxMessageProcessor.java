package org.bank.account.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.messaging.BillCommandGateway;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxMessageProcessor {

    private static final Duration BASE_DELAY = Duration.ofSeconds(1);
    private static final Duration MAX_BACKOFF = Duration.ofMinutes(5);
    private static final int WARN_AFTER_RETRIES = 5;
    private static final int ERROR_AFTER_RETRIES = 20;

    private final OutboxRepository outboxRepository;
    private final BillCommandGateway billCommandGateway;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(UUID messageId) {
        OutboxMessage message = outboxRepository
                .findByIdForUpdate(messageId)
                .orElse(null);

        if (message == null) {
            log.debug("Outbox message id={} was already removed", messageId);
            return;
        }

        if (message.getStatus() != OutboxStatus.PENDING) {
            log.debug("Skipping outbox message id={} because its status is {}", messageId, message.getStatus());
            return;
        }

        if (message.getNextAttemptAt() != null && message.getNextAttemptAt().isAfter(OffsetDateTime.now())) {
            log.debug("Skipping outbox message id={} until nextAttemptAt={}", messageId, message.getNextAttemptAt());
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
        int retries = message.getRetryCount() + 1;

        message.setRetryCount(retries);
        message.setErrorMessage(resolveErrorMessage(exception));

        if (isPoison(exception)) {
            message.setStatus(OutboxStatus.FAILED);

            log.error(
                    "Outbox message id={} is poison and will not be retried",
                    message.getId(),
                    exception
            );

            outboxRepository.save(message);
            return;
        }

        OffsetDateTime nextAttemptAt =
                OffsetDateTime.now().plus(backoff(retries));

        message.setStatus(OutboxStatus.PENDING);
        message.setNextAttemptAt(nextAttemptAt);

        log.warn(
                "Failed to publish outbox message id={}. "
                        + "Retry={}, nextAttemptAt={}",
                message.getId(),
                retries,
                nextAttemptAt,
                exception
        );

        if (retries == ERROR_AFTER_RETRIES) {
            log.error(
                    "Outbox message id={} is still unpublished after {} retries",
                    message.getId(),
                    retries
            );
        } else if (retries == WARN_AFTER_RETRIES) {
            log.error(
                    "Outbox message id={} has not been published after {} retries",
                    message.getId(),
                    retries
            );
        }

        outboxRepository.save(message);
    }

    private static Duration backoff(int retries) {
        long multiplier = 1L << Math.min(Math.max(retries, 1), 16);
        long millis = Math.min(
                BASE_DELAY.multipliedBy(multiplier).toMillis(),
                MAX_BACKOFF.toMillis()
        );
        return Duration.ofMillis(millis);
    }

    private static boolean isPoison(Exception exception) {
        return exception instanceof JsonProcessingException
                || isUnknownEventType(exception);
    }

    private static boolean isUnknownEventType(Exception exception) {
        return exception instanceof IllegalStateException
                && exception.getMessage() != null
                && exception.getMessage().startsWith("Unknown outbox event type:");
    }

    private String resolveErrorMessage(Exception exception) {
        String message = exception.getMessage();

        if (message != null && !message.isBlank()) {
            return message;
        }

        return exception.getClass().getSimpleName();
    }
}