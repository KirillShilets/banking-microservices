package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.handler.event.DepositEvent;
import org.bank.bill.handler.event.NotificationEvent;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.ForbiddenException;
import org.bank.exception.NotFoundException;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final AccountQueryGateway accountQueryGateway;
    private final ApplicationEventPublisher eventPublisher;
    private final AuthenticatedUser authenticatedUser;

    private final BigDecimal minDepositAmount;

    public BillServiceImpl(BillRepository billRepository,
                           AccountQueryGateway accountQueryGateway,
                           ApplicationEventPublisher eventPublisher,
                           AuthenticatedUser authenticatedUser,
                           @Value("${app.deposit.min-amount:2.60}") BigDecimal minDepositAmount) {
        this.billRepository = billRepository;
        this.accountQueryGateway = accountQueryGateway;
        this.eventPublisher = eventPublisher;
        this.authenticatedUser = authenticatedUser;
        this.minDepositAmount = minDepositAmount;
    }

    @Override
    @Transactional(readOnly = true)
    public BillResponseDTO getBill(Long billId) {
        Bill bill = getBillById(billId);
        assertCanAccessBill(bill);
        return createResponseBillDTO(bill);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillResponseDTO> getBillsByAccountId(Long accountId) {
        assertCanAccessAccount(accountId);
        return billRepository.getBillsByAccountId(accountId).stream()
                .map(this::createResponseBillDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Long createBill(Long accountId, BigDecimal amount, Boolean overdraftEnabled) {
        assertCanAccessAccount(accountId);
        Bill bill = new Bill(accountId, amount, overdraftEnabled);
        if (!billRepository.existsBillByAccountId(accountId)) {
            bill.setIsDefault(true);
        }
        return billRepository.save(bill).getBillId();
    }

    @Override
    @Transactional
    public List<Long> createBillsForAccount(Long accountId, List<CreateBillRequestDTO> bills) {
        assertCanAccessAccount(accountId);
        List<Bill> billsToSave = bills.stream()
                .map(dto -> new Bill(accountId, dto.amount(), dto.overdraftEnabled()))
                .collect(Collectors.toList());

        if (!billsToSave.isEmpty() && !billRepository.existsBillByAccountId(accountId)) {
            billsToSave.get(0).setIsDefault(true);
        }

        return billRepository.saveAll(billsToSave).stream()
                .map(Bill::getBillId)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BillResponseDTO updateBill(Long billId, Long accountId, BigDecimal amount, Boolean overdraftEnabled) {
        Bill billToUpdate = getBillById(billId);
        assertCanAccessBill(billToUpdate);

        if (!accountId.equals(billToUpdate.getAccountId())) {
            assertCanAccessAccount(accountId);
        }

        billToUpdate.setAccountId(accountId);
        billToUpdate.setAmount(amount);
        billToUpdate.setOverdraftEnabled(overdraftEnabled);
        return createResponseBillDTO(billRepository.save(billToUpdate));
    }

    @Override
    @Transactional
    public BillDepositResponseDTO depositBill(Long billId, BigDecimal amount, String email) {
        if (amount.compareTo(minDepositAmount) < 0) {
            throw new BadRequestException("Deposit amount " + amount + " is less than minimum required: " + minDepositAmount);
        }

        Bill bill = getBillById(billId);
        AccountResponseDTO account = assertCanAccessBill(bill);

        if (!account.email().equalsIgnoreCase(email)) {
            throw new BadRequestException("Provided email: " + email + " does not belong to account owner");
        }

        bill.setAmount(bill.getAmount().add(amount));
        billRepository.save(bill);

        eventPublisher.publishEvent(new NotificationEvent(billId, amount, email));
        eventPublisher.publishEvent(new DepositEvent(billId, amount, email));
        return new BillDepositResponseDTO(billId, bill.getAccountId(), bill.getAmount(), email,
                bill.getIsDefault(), bill.getOverdraftEnabled(), bill.getCreationDate());
    }

    @Override
    @Transactional
    public void deleteBill(Long billId) {
        Bill bill = getBillById(billId);
        assertCanAccessBill(bill);
        billRepository.delete(bill);
    }

    @Override
    @Transactional
    public void deleteBillsByAccountId(Long accountId) {
        if (!authenticatedUser.hasRole(BankRoles.ADMIN)) {
            throw new ForbiddenException("Only admin can delete all bills of an account");
        }
        billRepository.deleteBillsByAccountId(accountId);
    }

    private Bill getBillById(Long billId) {
        return billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Unable to find bill with id: " + billId));
    }

    private AccountResponseDTO assertCanAccessAccount(Long accountId) {
        AccountResponseDTO account = accountQueryGateway.getAccount(accountId);
        if (authenticatedUser.hasRole(BankRoles.ADMIN) || authenticatedUser.hasRole(BankRoles.EMPLOYEE)) {
            return account;
        }
        if (authenticatedUser.hasRole(BankRoles.CUSTOMER)
                && authenticatedUser.subject().equals(account.ownerSubject())) {
            return account;
        }
        throw new ForbiddenException("Access to this account's bills is denied");
    }

    private AccountResponseDTO assertCanAccessBill(Bill bill) {
        return assertCanAccessAccount(bill.getAccountId());
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