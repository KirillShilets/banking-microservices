package org.bank.account.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxScheduler {

    private static final int BATCH_SIZE = 50;

    private final OutboxRepository outboxRepository;
    private final OutboxMessageProcessor outboxMessageProcessor;

    @Scheduled(fixedDelayString = "${app.outbox.scheduler.fixed-delay:1000}")
    public void processOutbox() {
        List<UUID> messageIds = outboxRepository.findIdsByStatus(
                OutboxStatus.PENDING,
                PageRequest.of(0, BATCH_SIZE)
        );

        if (messageIds.isEmpty()) {
            return;
        }

        log.debug(
                "Found {} pending outbox messages to process",
                messageIds.size()
        );

        for (UUID messageId : messageIds) {
            try {
                outboxMessageProcessor.process(messageId);
            } catch (Exception exception) {
                log.error(
                        "Unexpected error while processing outbox message id={}",
                        messageId,
                        exception
                );
            }
        }
    }
}