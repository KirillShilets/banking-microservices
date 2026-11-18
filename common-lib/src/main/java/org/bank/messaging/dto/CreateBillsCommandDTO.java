package org.bank.messaging.dto;

import org.bank.dto.request.CreateBillRequestDTO;

import java.util.List;
import java.util.UUID;

/**
 * Command that asks bill-service to open bills for an account.
 *
 * <p>Carries {@code ownerSubject} so the new bills can store the account owner
 * as a local projection instead of calling account-service back.
 */
public record CreateBillsCommandDTO(
        UUID messageId,
        Long accountId,
        String ownerSubject,
        List<CreateBillRequestDTO> bills
) {

    public CreateBillsCommandDTO(
            Long accountId,
            String ownerSubject,
            List<CreateBillRequestDTO> bills
    ) {
        this(UUID.randomUUID(), accountId, ownerSubject, bills);
    }

    public CreateBillsCommandDTO {
        bills = List.copyOf(bills);
    }
}
