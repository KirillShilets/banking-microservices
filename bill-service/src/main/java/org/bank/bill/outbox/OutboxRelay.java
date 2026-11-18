package org.bank.bill.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.bill.messaging.DepositCommandGateway;
import org.bank.bill.messaging.NotificationCommandGateway;
import org.bank.dto.request.DepositRequestDTO;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Publishes claimed outbox messages.
 *
 * <p>Deliberately not transactional: the relay used to publish every message
 * inside one transaction that held {@code FOR UPDATE} locks for as long as
 * RabbitMQ took to confirm (up to 50 x the confirm timeout). Now the lease is
 * committed first, publication happens with no database transaction open, and
 * the outcome is written afterwards by a separate bean.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxRelay {

    private static final int BATCH_SIZE = 50;

    /**
     * Must exceed the worst-case time needed to publish one batch, otherwise a
     * second replica could re-claim messages that are still in flight. The batch
     * is published sequentially and each publish waits up to the publisher
     * confirm timeout (5s by default), so 50 x 5s = ~4m plus database time.
     */
    private static final Duration LEASE = Duration.ofMinutes(10);

    private static final Duration BASE_DELAY = Duration.ofSeconds(1);
    private static final Duration MAX_BACKOFF = Duration.ofMinutes(5);

    private final OutboxClaimer outboxClaimer;
    private final OutboxRepository outboxRepository;
    private final OutboxStatusWriter outboxStatusWriter;
    private final DepositCommandGateway depositCommandGateway;
    private final NotificationCommandGateway notificationCommandGateway;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${app.outbox.scheduler.fixed-delay:1000}")
    public void processOutbox() {
        List<UUID> claimedIds = outboxClaimer.claim(BATCH_SIZE, LEASE);

        for (UUID messageId : claimedIds) {
            publish(messageId);
        }
    }

    private void publish(UUID messageId) {
        OutboxMessage message = outboxRepository.findById(messageId).orElse(null);

        if (message == null) {
            log.debug("Outbox message id={} disappeared before it was published", messageId);
            return;
        }

        try {
            DepositRequestDTO request = readPayload(message);
            dispatch(message, request);

            outboxStatusWriter.markSent(messageId);
            log.debug("Published outbox message id={} eventType={}",
                    messageId, message.getEventType());
        } catch (Exception exception) {
            handleFailure(message, exception);
        }
    }

    private DepositRequestDTO readPayload(OutboxMessage message) {
        try {
            return objectMapper.readValue(message.getPayload(), DepositRequestDTO.class);
        } catch (JsonProcessingException exception) {
            throw new OutboxPayloadException(
                    "Cannot read outbox payload for message id=" + message.getId(),
                    exception
            );
        }
    }

    private void dispatch(OutboxMessage message, DepositRequestDTO request) {
        switch (message.getEventType()) {
            case OutboxEventTypes.DEPOSIT_CREATED -> depositCommandGateway.saveDeposit(request);
            case OutboxEventTypes.NOTIFICATION_CREATED ->
                    notificationCommandGateway.sendDepositNotification(request);
            default -> throw new UnknownOutboxEventTypeException(message.getEventType());
        }
    }

    private void handleFailure(OutboxMessage message, Exception exception) {
        int retries = message.getRetryCount() + 1;

        if (isPoison(exception)) {
            outboxStatusWriter.markFailed(message.getId(), exception.toString());

            // FAILED rows are never picked up again: without this line the
            // deposit record could disappear with no trace anywhere.
            log.error("Outbox message id={} eventType={} moved to FAILED after {} attempts",
                    message.getId(), message.getEventType(), retries, exception);

            return;
        }

        OffsetDateTime nextAttemptAt = OffsetDateTime.now().plus(backoff(retries));
        outboxStatusWriter.markRetry(message.getId(), nextAttemptAt, exception.toString());

        log.warn("Outbox message id={} eventType={} failed on attempt {}, retrying at {}: {}",
                message.getId(), message.getEventType(), retries, nextAttemptAt,
                exception.toString());
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
        return exception instanceof UnknownOutboxEventTypeException
                || exception instanceof OutboxPayloadException;
    }
}
