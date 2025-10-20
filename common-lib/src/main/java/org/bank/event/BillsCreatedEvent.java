package org.bank.event;

import java.util.List;
import java.util.UUID;

public record BillsCreatedEvent(
        UUID eventId,
        Long accountId,
        List<Long> billIds
) {}
