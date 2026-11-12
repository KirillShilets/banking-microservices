package org.bank.bill.idempotency;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;

/**
 * Claims, releases and completes idempotency keys for one money-moving request.
 *
 * <p>The claim is committed before the deposit transaction starts; the
 * completion is written by the deposit transaction itself so that "money moved"
 * and "this key is done" can never disagree.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IdempotencyGuard {

    /**
     * A claim younger than this may still be running. Older claims are treated
     * as abandoned (the process died mid-request) and can be taken over.
     */
    private static final Duration CLAIM_TIMEOUT = Duration.ofMinutes(10);

    private final IdempotencyKeyRepository idempotencyKeyRepository;

    @Transactional
    public IdempotencyClaim claim(String key, String requestHash) {
        OffsetDateTime now = OffsetDateTime.now();

        if (idempotencyKeyRepository.tryClaim(key, requestHash, now) == 1) {
            return IdempotencyClaim.claimed();
        }

        IdempotencyKey existing = idempotencyKeyRepository.findById(key)
                .orElseThrow(() -> new IllegalStateException(
                        "Idempotency key vanished after a conflicting insert: " + key
                ));

        if (!existing.getRequestHash().equals(requestHash)) {
            log.warn("Idempotency key {} reused with a different payload", key);
            return IdempotencyClaim.conflict();
        }

        if (existing.getStatus() == IdempotencyStatus.COMPLETED) {
            return IdempotencyClaim.replay(existing.getResponseBody());
        }

        if (idempotencyKeyRepository.reclaimAbandoned(
                key,
                requestHash,
                now,
                now.minus(CLAIM_TIMEOUT)
        ) == 1) {
            log.warn("Reclaimed abandoned idempotency key {}", key);
            return IdempotencyClaim.claimed();
        }

        return IdempotencyClaim.inProgress();
    }

    /**
     * Drops the claim after a failed attempt so the client can retry instead of
     * waiting for the claim to go stale.
     */
    @Transactional
    public void release(String key) {
        idempotencyKeyRepository.release(key);
    }
}
