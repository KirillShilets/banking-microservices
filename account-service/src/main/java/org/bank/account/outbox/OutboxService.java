package org.bank.account.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    public void saveEvent(String aggregateType, String aggregateId, String eventType, Object payload) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);

            OutboxMessage outboxMessage = OutboxMessage.builder()
                    .id(UUID.randomUUID())
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .payload(jsonPayload)
                    .status(OutboxStatus.PENDING)
                    .retryCount(0)
                    .nextAttemptAt(OffsetDateTime.now())
                    .createdAt(OffsetDateTime.now())
                    .build();

            outboxRepository.save(outboxMessage);
            log.info("Appended outbox message: id={}, eventType={}, aggregateId={}",
                    outboxMessage.getId(), eventType, aggregateId);

        } catch (JsonProcessingException e) {
            log.error("Failed to serialize outbox event payload for aggregateId={}", aggregateId, e);
            throw new RuntimeException("Could not serialize event payload", e);
        }
    }
}
