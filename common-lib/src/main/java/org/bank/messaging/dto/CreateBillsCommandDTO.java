package org.bank.messaging.dto;

import org.bank.dto.request.CreateBillRequestDTO;

import java.util.List;

public record CreateBillsCommandDTO(Long accountId, List<CreateBillRequestDTO> bills) {

    public CreateBillsCommandDTO {
        bills = List.copyOf(bills);
    }
}
