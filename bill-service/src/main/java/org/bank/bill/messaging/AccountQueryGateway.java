package org.bank.bill.messaging;

import org.bank.dto.response.AccountResponseDTO;

public interface AccountQueryGateway {
    AccountResponseDTO getAccount(Long accountId);
}
