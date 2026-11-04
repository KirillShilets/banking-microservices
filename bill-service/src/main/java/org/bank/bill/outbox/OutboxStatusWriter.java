package org.bank.bill.outbox;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Records the outcome of a publish attempt in its own short transaction, so a
 * failure while writing the result can never roll back a delivery that already
 * happened.
 */
@Component
@RequiredArgsConstructor
public class OutboxStatusWriter {

    private final OutboxRepository outboxRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSent(UUID messageId) {
        outboxRepository.markSent(messageId, OffsetDateTime.now());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markRetry(UUID messageId, OffsetDateTime nextAttemptAt, String errorMessage) {
        outboxRepository.markRetry(messageId, nextAttemptAt, errorMessage);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID messageId, String errorMessage) {
        outboxRepository.markFailed(messageId, errorMessage);
    }
}
