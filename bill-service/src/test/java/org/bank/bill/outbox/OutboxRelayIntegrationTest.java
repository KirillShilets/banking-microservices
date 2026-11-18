package org.bank.bill.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.bill.messaging.DepositCommandGateway;
import org.bank.bill.messaging.NotificationCommandGateway;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.bank.dto.request.DepositRequestDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@EnablePostgresTestConfiguration
@SpringBootTest(properties = {
        // The scheduler must not race the explicit processOutbox() calls below.
        "app.outbox.scheduler.fixed-delay=3600000",
        "app.outbox.cleanup.fixed-delay=3600000"
})
@Tag("integration")
@DisplayName("Outbox relay")
class OutboxRelayIntegrationTest {

    @Autowired
    private OutboxRelay outboxRelay;

    @Autowired
    private OutboxRepository outboxRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DepositCommandGateway depositCommandGateway;

    @MockitoBean
    private NotificationCommandGateway notificationCommandGateway;

    @AfterEach
    void tearDown() {
        outboxRepository.deleteAll();
    }

    @Test
    @DisplayName("Publishes a claimed message and records it as sent")
    void publishesClaimedMessageAndMarksItSent() throws Exception {
        OutboxMessage message = pendingMessage(OutboxEventTypes.DEPOSIT_CREATED);

        outboxRelay.processOutbox();

        verify(depositCommandGateway).saveDeposit(any(DepositRequestDTO.class));

        OutboxMessage stored = outboxRepository.findById(message.getId()).orElseThrow();

        assertThat(stored.getStatus()).isEqualTo(OutboxStatus.SENT);
        assertThat(stored.getSentAt()).isNotNull();
        assertThat(stored.getLeaseExpiresAt()).as("lease released after publishing").isNull();
    }

    @Test
    @DisplayName("Parks an unknown event type as failed instead of retrying it")
    void parksUnknownEventTypeAsFailed() throws Exception {
        OutboxMessage message = pendingMessage("SOMETHING_ELSE");

        outboxRelay.processOutbox();

        verify(depositCommandGateway, never()).saveDeposit(any());
        verify(notificationCommandGateway, never()).sendDepositNotification(any());

        OutboxMessage stored = outboxRepository.findById(message.getId()).orElseThrow();

        assertThat(stored.getStatus()).isEqualTo(OutboxStatus.FAILED);
        assertThat(stored.getRetryCount()).isEqualTo(1);
        assertThat(stored.getErrorMessage()).contains("SOMETHING_ELSE");
        assertThat(stored.getLeaseExpiresAt()).isNull();
    }

    private OutboxMessage pendingMessage(String eventType) throws Exception {
        String payload = objectMapper.writeValueAsString(new DepositRequestDTO(
                1L,
                new BigDecimal("10.00"),
                "customer@example.test",
                UUID.randomUUID()
        ));

        return outboxRepository.save(OutboxMessage.builder()
                .id(UUID.randomUUID())
                .aggregateType("BILL")
                .aggregateId("1")
                .eventType(eventType)
                .payload(payload)
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .nextAttemptAt(OffsetDateTime.now().minusSeconds(1))
                .createdAt(OffsetDateTime.now())
                .build());
    }
}
