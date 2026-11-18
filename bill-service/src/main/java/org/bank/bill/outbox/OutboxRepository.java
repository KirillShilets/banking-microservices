package org.bank.bill.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OutboxRepository extends JpaRepository<OutboxMessage, UUID> {

    /**
     * Locks the rows that are due and not currently leased. Must run inside the
     * claiming transaction: {@code FOR UPDATE SKIP LOCKED} is what makes two
     * relay replicas pick disjoint batches.
     */
    @Query(value = """
            SELECT id FROM outbox
            WHERE status = 'PENDING'
                AND next_attempt_at <= :now
                AND (lease_expires_at IS NULL OR lease_expires_at < :now)
            ORDER BY created_at ASC
            LIMIT :batchSize
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<UUID> lockClaimableIds(
            @Param("now") OffsetDateTime now,
            @Param("batchSize") int batchSize
    );

    @Modifying
    @Query(
            value = "UPDATE outbox SET lease_expires_at = :leaseExpiresAt WHERE id IN (:ids)",
            nativeQuery = true
    )
    int applyLease(
            @Param("ids") Collection<UUID> ids,
            @Param("leaseExpiresAt") OffsetDateTime leaseExpiresAt
    );

    @Modifying
    @Query(value = """
            UPDATE outbox
            SET status = 'SENT',
                sent_at = :sentAt,
                error_message = NULL,
                lease_expires_at = NULL
            WHERE id = :id
            """, nativeQuery = true)
    int markSent(@Param("id") UUID id, @Param("sentAt") OffsetDateTime sentAt);

    @Modifying
    @Query(value = """
            UPDATE outbox
            SET status = 'PENDING',
                retry_count = retry_count + 1,
                error_message = :errorMessage,
                next_attempt_at = :nextAttemptAt,
                lease_expires_at = NULL
            WHERE id = :id
            """, nativeQuery = true)
    int markRetry(
            @Param("id") UUID id,
            @Param("nextAttemptAt") OffsetDateTime nextAttemptAt,
            @Param("errorMessage") String errorMessage
    );

    @Modifying
    @Query(value = """
            UPDATE outbox
            SET status = 'FAILED',
                retry_count = retry_count + 1,
                error_message = :errorMessage,
                lease_expires_at = NULL
            WHERE id = :id
            """, nativeQuery = true)
    int markFailed(@Param("id") UUID id, @Param("errorMessage") String errorMessage);

    @Query(value = """
            SELECT id FROM outbox
            WHERE status = 'SENT'
                AND sent_at < :cutoff
            ORDER BY sent_at ASC
            LIMIT :batchSize
            """, nativeQuery = true)
    List<UUID> findDeliveredIdsBefore(
            @Param("cutoff") OffsetDateTime cutoff,
            @Param("batchSize") int batchSize
    );

    @Modifying
    @Query(value = "DELETE FROM outbox WHERE id IN (:ids)", nativeQuery = true)
    int deleteByIds(@Param("ids") Collection<UUID> ids);
}
