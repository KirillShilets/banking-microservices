package org.bank.bill.idempotency;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * One row per client-supplied Idempotency-Key.
 *
 * <p>{@code IN_PROGRESS} means a request is being processed right now;
 * {@code COMPLETED} means the response stored in {@code response_body} must be
 * replayed for any repeat of the same key.
 */
@Entity
@Table(name = "idempotency_keys")
@Getter
@NoArgsConstructor
public class IdempotencyKey {

    @Id
    @Column(name = "idempotency_key", nullable = false, updatable = false, length = 128)
    private String key;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private IdempotencyStatus status;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    public IdempotencyKey(
            String key,
            String requestHash,
            IdempotencyStatus status,
            OffsetDateTime createdAt
    ) {
        this.key = key;
        this.requestHash = requestHash;
        this.status = status;
        this.createdAt = createdAt;
    }

    public void complete(String responseBody, OffsetDateTime completedAt) {
        this.status = IdempotencyStatus.COMPLETED;
        this.responseBody = responseBody;
        this.completedAt = completedAt;
    }

    public void restart(String requestHash, OffsetDateTime createdAt) {
        this.requestHash = requestHash;
        this.status = IdempotencyStatus.IN_PROGRESS;
        this.responseBody = null;
        this.completedAt = null;
        this.createdAt = createdAt;
    }
}
