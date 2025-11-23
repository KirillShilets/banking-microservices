package org.bank.bill.handler.event;

import org.bank.dto.request.DepositRequestDTO;

public record DepositEvent(DepositRequestDTO dto) {

}
