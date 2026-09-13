package org.bank.messaging.dto;

import java.util.UUID;

public record DeleteBillsByAccountCommandDTO(UUID messageId, Long accountId) {

    public DeleteBillsByAccountCommandDTO(Long accountId) {
        this(UUID.randomUUID(), accountId);
    }
}
