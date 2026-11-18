package org.bank.bill.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Claims a batch of due messages for one relay instance.
 *
 * <p>The whole point is that this is a separate bean: the relay calls
 * {@link #claim} from a non-transactional context, so the lease is committed
 * before any message is published. Annotating a method on the relay itself with
 * {@code @Transactional} would be a self-invocation and would silently run in no
 * transaction at all.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxClaimer {

    private final OutboxRepository outboxRepository;

    @Transactional
    public List<UUID> claim(int batchSize, Duration lease) {
        OffsetDateTime now = OffsetDateTime.now();

        List<UUID> claimedIds = outboxRepository.lockClaimableIds(now, batchSize);

        if (claimedIds.isEmpty()) {
            return List.of();
        }

        outboxRepository.applyLease(claimedIds, now.plus(lease));

        log.debug("Claimed {} outbox messages for {} until {}",
                claimedIds.size(), lease, now.plus(lease));

        return claimedIds;
    }
}
