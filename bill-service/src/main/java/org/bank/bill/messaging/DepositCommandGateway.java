package org.bank.bill.messaging;

import org.bank.dto.request.DepositRequestDTO;

public interface DepositCommandGateway {
    void saveDeposit(DepositRequestDTO requestDTO);
}
