package org.bank.notification.repository;

import org.bank.notification.entity.DeliveryStatus;
import org.bank.notification.entity.NotificationDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, UUID> {

    @Modifying
    @Query(value = """
        INSERT INTO notification_deliveries (message_id, status, created_at)
        SELECT CAST(:messageId AS UUID),
               'CLAIMED',
               CAST(:createdAt AS TIMESTAMP WITH TIME ZONE)
        WHERE NOT EXISTS (
            SELECT 1 FROM notification_deliveries WHERE message_id = :messageId
        )
    """, nativeQuery = true)
    int tryClaimDelivery(
            @Param("messageId") UUID messageId,
            @Param("createdAt") OffsetDateTime createdAt
    );

    @Modifying
    @Query(value = """
        UPDATE notification_deliveries
        SET status = 'CLAIMED',
            created_at = :reclaimedAt
        WHERE message_id = :messageId
          AND (
                status = 'FAILED'
                OR (status = 'CLAIMED' AND created_at < :staleBefore)
              )
    """, nativeQuery = true)
    int reclaimDelivery(
            @Param("messageId") UUID messageId,
            @Param("staleBefore") OffsetDateTime staleBefore,
            @Param("reclaimedAt") OffsetDateTime reclaimedAt
    );

    @Modifying
    @Query("""
        UPDATE NotificationDelivery n
        SET n.status = :status, n.sentAt = :sentAt
        WHERE n.messageId = :messageId
    """)
    int updateStatus(
            @Param("messageId") UUID messageId,
            @Param("status") DeliveryStatus status,
            @Param("sentAt") OffsetDateTime sentAt
    );
}