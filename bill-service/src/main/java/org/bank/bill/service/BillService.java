package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.exception.BillNotFoundException;
import org.bank.bill.repository.BillRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class BillService {

    private final BillRepository billRepository;

    @Autowired
    public BillService(BillRepository billRepository) {
        this.billRepository = billRepository;
    }

    public Bill getBillById(Long billId) {
        return billRepository.findById(billId)
                .orElseThrow(() -> new BillNotFoundException("Unable to find bill with id: " + billId));
    }

    public Long createBill(Long accountId, BigDecimal amount,
                           Boolean isDefault, Boolean overdratEnabled) {
        Bill bill = new Bill(accountId, amount, isDefault,OffsetDateTime.now(), overdratEnabled);
        return billRepository.save(bill).getBillId();
    }

    public Bill updateBill(Long billId, Long accountId, BigDecimal amount,
                           Boolean isDefault, Boolean overdratEnabled) {
        Bill billToUpdate = getBillById(billId);
        billToUpdate.setBillId(billId);
        billToUpdate.setAmount(amount);
        billToUpdate.setIsDefault(isDefault);
        billToUpdate.setAccountId(accountId);
        billToUpdate.setOverdraftEnabled(overdratEnabled);
        return billRepository.save(billToUpdate);
    }

    public Bill deleteBill(Long billId) {
        Bill bill = getBillById(billId);
        billRepository.deleteById(billId);
        return bill;
    }

    public List<Bill> getBillsByAccountId(Long accountId) {
        return billRepository.getBillsByAccountId(accountId);
    }
}
