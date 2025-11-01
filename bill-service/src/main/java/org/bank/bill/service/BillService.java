package org.bank.bill.service;

import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;

import java.math.BigDecimal;
import java.util.List;

public interface BillService {
    List<Long> createBillsForAccount(Long accountId, List<CreateBillRequestDTO> bills);
    BillResponseDTO getBillById(Long billId);
    Long createBill(Long accountId, BigDecimal amount, Boolean isDefault, Boolean overdraftEnabled);
    BillDepositResponseDTO depositBill(Long accountId, BigDecimal amount);
    BillResponseDTO updateBill(Long billId, Long accountId, BigDecimal amount, Boolean isDefault, Boolean overdraftEnabled);
    BillResponseDTO deleteBill(Long billId);
    void deleteBillsByAccountId(Long accountId);
    List<BillResponseDTO> getBillsByAccountId(Long accountId);
}
