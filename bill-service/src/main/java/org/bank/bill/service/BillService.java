package org.bank.bill.service;

import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;

import java.math.BigDecimal;
import java.util.List;

public interface BillService {
    List<Long> createBillsForAccount(Long accountId, List<CreateBillRequestDTO> bills);
    BillResponseDTO getBill(Long billId);
    Long createBill(Long accountId, BigDecimal amount, Boolean overdraftEnabled);
    BillDepositResponseDTO depositBill(Long billId, BigDecimal amount, String email);
    BillResponseDTO updateBill(Long billId, Long accountId, BigDecimal amount, Boolean overdraftEnabled);
    void deleteBill(Long billId);
    void deleteBillsByAccountId(Long accountId);
    List<BillResponseDTO> getBillsByAccountId(Long accountId);
}
