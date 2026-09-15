package org.bank.account.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OutboxRepository extends JpaRepository<OutboxMessage, UUID> {

    @Transactional(readOnly = true)
    @Query("""
            SELECT message.id
            FROM OutboxMessage message
            WHERE message.status = :status
            ORDER BY message.createdAt ASC
            """)
    List<UUID> findIdsByStatus(
            @Param("status") OutboxStatus status,
            org.springframework.data.domain.Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT message
            FROM OutboxMessage message
            WHERE message.id = :id
            """)
    Optional<OutboxMessage> findByIdForUpdate(@Param("id") UUID id);
}