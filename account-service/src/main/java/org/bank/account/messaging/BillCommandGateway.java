package org.bank.account.messaging;

import org.bank.messaging.dto.CreateBillsCommandDTO;

public interface BillCommandGateway {
    void createBillsForAccount(CreateBillsCommandDTO command);
}