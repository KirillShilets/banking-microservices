package org.bank.bill.service;

import org.bank.client.AccountServiceClient;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.exception.NotFoundException;
import org.bank.bill.entity.Bill;
import org.bank.bill.repository.BillRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final AccountServiceClient accountServiceClient;

    @Autowired
    public BillServiceImpl(BillRepository billRepository, AccountServiceClient accountServiceClient) {
        this.billRepository = billRepository;
        this.accountServiceClient = accountServiceClient;
    }


    @Override
    public List<Long> createBillsForAccount(Long accountId, List<CreateBillRequestDTO> bills) {
        List<Bill> billsToSave = bills.stream()
                .map(dto -> new Bill(accountId, dto.getAmount(),
                        dto.getIsDefault(), OffsetDateTime.now(), dto.getOverdraftEnabled()))
                .collect(Collectors.toList());
        List<Bill> savedBills = billRepository.saveAll(billsToSave);

        return savedBills.stream()
                .map(Bill::getBillId)
                .collect(Collectors.toList());
    }

    @Override
    public BillResponseDTO getBillById(Long billId) {
        return createResponseBillDTO(findBillById(billId));
    }

    @Override
    public Long createBill(Long accountId, BigDecimal amount, Boolean isDefault, Boolean overdraftEnabled) {
        AccountResponseDTO account = accountServiceClient.getAccount(accountId);
        Bill bill = new Bill(accountId, amount, isDefault, overdraftEnabled);
        return billRepository.save(bill).getBillId();
    }

    @Override
    @Transactional
    public BillDepositResponseDTO depositBill(Long billId, BigDecimal amount) {
        Bill bill = findBillById(billId);
        bill.setAmount(bill.getAmount().add(amount));
        billRepository.save(bill);

        String email = accountServiceClient.getAccount(bill.getAccountId()).getEmail();

        return new BillDepositResponseDTO(billId, bill.getAccountId(), bill.getAmount(), email,
                bill.getIsDefault(), bill.getOverdraftEnabled(), bill.getCreationDate());
    }

    @Override
    public BillResponseDTO updateBill(Long billId, Long accountId, BigDecimal amount,
                                      Boolean isDefault, Boolean overdraftEnabled) {
        Bill billToUpdate = findBillById(billId);
        billToUpdate.setAccountId(accountId);
        billToUpdate.setAmount(amount);
        billToUpdate.setIsDefault(isDefault);
        billToUpdate.setOverdraftEnabled(overdraftEnabled);
        Bill updatedBill = billRepository.save(billToUpdate);
        return createResponseBillDTO(updatedBill);
    }

    @Override
    public BillResponseDTO deleteBill(Long billId) {
        Bill bill = findBillById(billId);
        billRepository.delete(bill);
        return createResponseBillDTO(bill);
    }

    @Override
    public List<BillResponseDTO> getBillsByAccountId(Long accountId) {
        return billRepository.getBillsByAccountId(accountId)
                .stream()
                .map(this::createResponseBillDTO)
                .collect(Collectors.toList());
    }

    private Bill findBillById(Long billId) {
        return billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Unable to find bill with id: " + billId));
    }

    private BillResponseDTO createResponseBillDTO(Bill bill) {
        return new BillResponseDTO(
                bill.getBillId(),
                bill.getAccountId(),
                bill.getAmount(),
                bill.getIsDefault(),
                bill.getCreationDate(),
                bill.getOverdraftEnabled()
        );
    }
}

