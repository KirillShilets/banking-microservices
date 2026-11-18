package org.bank.bill.outbox;

import lombok.extern.slf4j.Slf4j;
import org.bank.bill.config.OutboxProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

/**
 * Keeps the outbox table bounded. Without it every deposit leaves a row behind
 * forever, and the claim query has to filter an ever growing table.
 */
@Slf4j
@Component
public class OutboxCleaner {

    private static final int BATCH_SIZE = 1000;
    private static final int MAX_BATCHES_PER_RUN = 50;

    private final OutboxRetention outboxRetention;
    private final OutboxProperties outboxProperties;

    public OutboxCleaner(
            OutboxRetention outboxRetention,
            OutboxProperties outboxProperties
    ) {
        this.outboxRetention = outboxRetention;
        this.outboxProperties = outboxProperties;
    }

    @Scheduled(
            fixedDelayString = "${app.outbox.cleanup.fixed-delay:3600000}",
            initialDelayString = "${app.outbox.cleanup.initial-delay:60000}"
    )
    public void purgeDeliveredMessages() {
        OffsetDateTime cutoff = OffsetDateTime.now()
                .minus(outboxProperties.retention());

        int deletedTotal = 0;

        for (int batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
            int deleted = outboxRetention.purgeDeliveredBefore(cutoff, BATCH_SIZE);

            if (deleted == 0) {
                break;
            }

            deletedTotal += deleted;
        }

        if (deletedTotal > 0) {
            log.info("Purged {} delivered outbox messages older than {}",
                    deletedTotal, cutoff);
        }
    }
}
