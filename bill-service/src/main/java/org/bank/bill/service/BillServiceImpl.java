package org.bank.bill.service;

import lombok.RequiredArgsConstructor;
import org.bank.bill.handler.event.DepositEvent;
import org.bank.bill.handler.event.NotificationEvent;
import org.bank.client.AccountServiceClient;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.NotFoundException;
import org.bank.bill.entity.Bill;
import org.bank.bill.repository.BillRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final AccountServiceClient accountServiceClient;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.deposit.min-amount:2.60}")
    private BigDecimal minDepositAmount;

    @Override
    @Transactional(readOnly = true)
    public BillResponseDTO getBill(Long billId) {
        return createResponseBillDTO(getBillById(billId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillResponseDTO> getBillsByAccountId(Long accountId) {
        return billRepository.getBillsByAccountId(accountId).stream()
                .map(this::createResponseBillDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Long createBill(Long accountId, BigDecimal amount, Boolean overdraftEnabled) {
        accountServiceClient.getAccount(accountId);
        Bill bill = new Bill(accountId, amount, overdraftEnabled);
        if(!billRepository.existsBillByAccountId(accountId)) {
            bill.setIsDefault(true);
        }

        return billRepository.save(bill).getBillId();
    }

    @Override
    @Transactional
    public List<Long> createBillsForAccount(Long accountId, List<CreateBillRequestDTO> bills) {
        accountServiceClient.getAccount(accountId);
        List<Bill> billsToSave = bills.stream()
                .map(dto -> new Bill(accountId, dto.amount(), dto.overdraftEnabled()))
                .collect(Collectors.toList());

        if (!billsToSave.isEmpty()) {
            boolean hasBill = billRepository.existsBillByAccountId(accountId);
            if (!hasBill) {
                billsToSave.get(0).setIsDefault(true);
            }
        }

        return billRepository.saveAll(billsToSave).stream()
                .map(Bill::getBillId)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BillResponseDTO updateBill(Long billId, Long accountId, BigDecimal amount, Boolean overdraftEnabled) {
        accountServiceClient.getAccount(accountId);
        Bill billToUpdate = getBillById(billId);
        billToUpdate.setAccountId(accountId);
        billToUpdate.setAmount(amount);
        billToUpdate.setOverdraftEnabled(overdraftEnabled);
        Bill updatedBill = billRepository.save(billToUpdate);
        return createResponseBillDTO(updatedBill);
    }

    @Override
    @Transactional
    public BillDepositResponseDTO depositBill(Long billId, BigDecimal amount, String email) {
        if(amount.compareTo(minDepositAmount) < 0) {
            throw new BadRequestException("Deposit amount " + amount +  " is less than minimum required: " + minDepositAmount);
        }

        Bill bill = getBillById(billId);
        bill.setAmount(bill.getAmount().add(amount));

        AccountResponseDTO account = accountServiceClient.getAccount(bill.getAccountId());
        if(!account.email().equalsIgnoreCase(email)) {
            throw new BadRequestException("Provided email: " + email + " does not belong to account owner");
        }

        billRepository.save(bill);
        eventPublisher.publishEvent(new NotificationEvent(billId, amount, email));
        eventPublisher.publishEvent(new DepositEvent(billId, amount, email));
        return new BillDepositResponseDTO(billId, bill.getAccountId(), bill.getAmount(), email,
                bill.getIsDefault(), bill.getOverdraftEnabled(), bill.getCreationDate());
    }

    @Override
    @Transactional
    public void deleteBill(Long billId) {
        if(!billRepository.existsBillByBillId(billId)) {
            throw new NotFoundException("Unable to find bill with id: " + billId);
        }
        billRepository.deleteById(billId);
    }

    @Override
    @Transactional
    public void deleteBillsByAccountId(Long accountId) {
        billRepository.deleteBillsByAccountId(accountId);
    }

    private Bill getBillById(Long billId) {
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

