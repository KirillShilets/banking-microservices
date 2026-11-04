package org.bank.bill.outbox;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Deletes delivered outbox rows in short transactions. FAILED rows are kept on
 * purpose: they are the only record of a message that will never be delivered.
 */
@Component
@RequiredArgsConstructor
public class OutboxRetention {

    private final OutboxRepository outboxRepository;

    @Transactional
    public int purgeDeliveredBefore(OffsetDateTime cutoff, int batchSize) {
        List<UUID> deliveredIds = outboxRepository.findDeliveredIdsBefore(cutoff, batchSize);

        if (deliveredIds.isEmpty()) {
            return 0;
        }

        return outboxRepository.deleteByIds(deliveredIds);
    }
}
