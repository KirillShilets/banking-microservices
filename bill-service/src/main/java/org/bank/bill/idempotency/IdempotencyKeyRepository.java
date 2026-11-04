package org.bank.bill.idempotency;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;

public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, String> {

    /**
     * Atomic claim. {@code INSERT ... ON CONFLICT DO NOTHING} is safe under
     * READ COMMITTED; a "check then insert" or "insert where not exists" is not,
     * because two concurrent transactions both observe the missing row.
     *
     * @return 1 when this call created the row, 0 when the key already existed
     */
    @Modifying
    @Query(value = """
            INSERT INTO idempotency_keys (idempotency_key, request_hash, status, created_at)
            VALUES (:key, :requestHash, 'IN_PROGRESS', :createdAt)
            ON CONFLICT (idempotency_key) DO NOTHING
            """, nativeQuery = true)
    int tryClaim(
            @Param("key") String key,
            @Param("requestHash") String requestHash,
            @Param("createdAt") OffsetDateTime createdAt
    );

    /**
     * Takes over a claim whose owner died before it could complete or release,
     * so an abandoned key does not block the client forever.
     */
    @Modifying
    @Query(value = """
            UPDATE idempotency_keys
            SET request_hash = :requestHash,
                status = 'IN_PROGRESS',
                response_body = NULL,
                completed_at = NULL,
                created_at = :now
            WHERE idempotency_key = :key
                AND status = 'IN_PROGRESS'
                AND created_at < :staleBefore
            """, nativeQuery = true)
    int reclaimAbandoned(
            @Param("key") String key,
            @Param("requestHash") String requestHash,
            @Param("now") OffsetDateTime now,
            @Param("staleBefore") OffsetDateTime staleBefore
    );

    @Modifying
    @Query(value = """
            UPDATE idempotency_keys
            SET status = 'COMPLETED',
                response_body = :responseBody,
                completed_at = :completedAt
            WHERE idempotency_key = :key
            """, nativeQuery = true)
    int complete(
            @Param("key") String key,
            @Param("responseBody") String responseBody,
            @Param("completedAt") OffsetDateTime completedAt
    );

    @Modifying
    @Query(value = """
            DELETE FROM idempotency_keys
            WHERE idempotency_key = :key AND status = 'IN_PROGRESS'
            """, nativeQuery = true)
    int release(@Param("key") String key);
}
