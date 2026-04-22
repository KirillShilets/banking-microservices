package org.bank.account.messaging;

import org.bank.dto.request.CreateBillRequestDTO;

import java.util.List;

public interface BillCommandGateway {
    void createBillsForAccount(Long accountId, List<CreateBillRequestDTO> bills);

    void deleteBillsByAccountId(Long accountId);
}
