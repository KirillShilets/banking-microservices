package org.bank.bill.service;

import lombok.RequiredArgsConstructor;
import org.bank.bill.entity.Bill;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.request.CreateBillRequestDTO;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * The transactional core of bill opening. Separate bean for the same reason as
 * {@link BillDepositExecutor}: the caller resolves the account owner remotely
 * before opening the transaction.
 */
@Component
@RequiredArgsConstructor
public class BillOpeningExecutor {

    private static final BigDecimal ZERO_BALANCE = new BigDecimal("0.00");

    private final BillRepository billRepository;

    @Transactional
    public Long openBill(Long accountId, String ownerSubject) {
        Bill bill = new Bill(accountId, ownerSubject, ZERO_BALANCE, false);

        if (!billRepository.existsBillByAccountId(accountId)) {
            bill.setIsDefault(true);
        }

        return billRepository.save(bill).getBillId();
    }

    @Transactional
    public List<Long> openBills(
            Long accountId,
            String ownerSubject,
            List<CreateBillRequestDTO> bills
    ) {
        List<Bill> billsToSave = bills.stream()
                .map(ignored -> new Bill(accountId, ownerSubject, ZERO_BALANCE, false))
                .collect(Collectors.toList());

        if (!billRepository.existsBillByAccountId(accountId)) {
            billsToSave.get(0).setIsDefault(true);
        }

        return billRepository.saveAll(billsToSave)
                .stream()
                .map(Bill::getBillId)
                .collect(Collectors.toList());
    }
}
