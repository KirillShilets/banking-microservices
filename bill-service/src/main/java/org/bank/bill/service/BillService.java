package org.bank.bill.service;

import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;

import java.math.BigDecimal;
import java.util.List;

public interface BillService {

    List<Long> createBillsForAccount(
            Long accountId,
            List<CreateBillRequestDTO> bills
    );

    /**
     * Opens bills on behalf of another service. The caller supplies the owner
     * because it is the service that owns account data.
     */
    List<Long> createBillsForAccountInternal(
            Long accountId,
            String ownerSubject,
            List<CreateBillRequestDTO> bills
    );

    BillResponseDTO getBill(Long billId);

    Long createBill(
            Long accountId,
            BigDecimal amount,
            Boolean overdraftEnabled
    );

    BillDepositResponseDTO depositBill(
            Long billId,
            BigDecimal amount
    );

    List<BillResponseDTO> getBillsByAccountId(Long accountId);
}
