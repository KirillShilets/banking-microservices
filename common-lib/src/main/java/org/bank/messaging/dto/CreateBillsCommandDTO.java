package org.bank.messaging.dto;

import org.bank.dto.request.CreateBillRequestDTO;

import java.util.List;
import java.util.UUID;

public record CreateBillsCommandDTO(UUID messageId, Long accountId, List<CreateBillRequestDTO> bills) {

    public CreateBillsCommandDTO(Long accountId, List<CreateBillRequestDTO> bills) {
        this(UUID.randomUUID(), accountId, bills);
    }

    public CreateBillsCommandDTO {
        bills = List.copyOf(bills);
    }
}
