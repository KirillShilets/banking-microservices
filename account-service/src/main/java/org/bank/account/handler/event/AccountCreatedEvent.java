package org.bank.account.handler.event;

import org.bank.dto.request.CreateBillRequestDTO;

import java.util.List;

public record AccountCreatedEvent(Long accountId, List<CreateBillRequestDTO> bills) {
}
