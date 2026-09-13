package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.outbox.OutboxService;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.ForbiddenException;
import org.bank.exception.NotFoundException;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
import org.bank.validation.BillOpeningValidator;
import org.bank.validation.MoneyValidation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final AccountQueryGateway accountQueryGateway;
    private final OutboxService outboxService;
    private final AuthenticatedUser authenticatedUser;

    private final BigDecimal minDepositAmount;
    private final boolean sandboxDepositsEnabled;

    public BillServiceImpl(
            BillRepository billRepository,
            AccountQueryGateway accountQueryGateway,
            OutboxService outboxService,
            AuthenticatedUser authenticatedUser,
            @Value("${app.deposit.min-amount:10.00}")
            BigDecimal minDepositAmount,
            @Value("${app.sandbox.deposits-enabled:false}")
            boolean sandboxDepositsEnabled
    ) {
        this.billRepository = billRepository;
        this.accountQueryGateway = accountQueryGateway;
        this.outboxService = outboxService;
        this.authenticatedUser = authenticatedUser;

        try {
            this.minDepositAmount =
                    MoneyValidation.positiveAmount(minDepositAmount);
        } catch (BadRequestException exception) {
            throw new IllegalArgumentException(
                    "app.deposit.min-amount must be a valid positive monetary amount",
                    exception
            );
        }

        this.sandboxDepositsEnabled = sandboxDepositsEnabled;
    }

    @Override
    @Transactional(readOnly = true)
    public BillResponseDTO getBill(Long billId) {
        Bill bill = getBillById(billId);
        assertCanAccessBill(bill);

        return toResponse(bill);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillResponseDTO> getBillsByAccountId(Long accountId) {
        BillOpeningValidator.validateAccountId(accountId);
        assertCanAccessAccount(accountId);

        return billRepository.getBillsByAccountId(accountId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Long createBill(
            Long accountId,
            BigDecimal amount,
            Boolean overdraftEnabled
    ) {
        BillOpeningValidator.validateAccountId(accountId);
        BillOpeningValidator.validateOpening(amount, overdraftEnabled);

        assertCanAccessAccount(accountId);

        Bill bill = new Bill(
                accountId,
                new BigDecimal("0.00"),
                false
        );

        if (!billRepository.existsBillByAccountId(accountId)) {
            bill.setIsDefault(true);
        }

        return billRepository.save(bill).getBillId();
    }

    @Override
    @Transactional
    public List<Long> createBillsForAccount(
            Long accountId,
            List<CreateBillRequestDTO> bills
    ) {
        BillOpeningValidator.validateAccountId(accountId);
        BillOpeningValidator.validateOpenings(bills);

        assertCanAccessAccount(accountId);

        return saveBillsForAccount(accountId, bills);
    }

    @Override
    @Transactional
    public List<Long> createBillsForAccountInternal(
            Long accountId,
            List<CreateBillRequestDTO> bills
    ) {
        BillOpeningValidator.validateAccountId(accountId);
        BillOpeningValidator.validateOpenings(bills);

        return saveBillsForAccount(accountId, bills);
    }

    @Override
    @Transactional
    public BillDepositResponseDTO depositBill(
            Long billId,
            BigDecimal amount
    ) {
        assertSandboxDepositAllowed();

        if (billId == null || billId <= 0) {
            throw new BadRequestException("Bill id must be positive");
        }

        BigDecimal normalizedAmount =
                MoneyValidation.positiveAmount(amount);

        if (normalizedAmount.compareTo(minDepositAmount) < 0) {
            throw new BadRequestException(
                    "Deposit amount is less than minimum: "
                            + minDepositAmount.toPlainString()
            );
        }

        Bill bill = billRepository.findByIdForUpdate(billId)
                .orElseThrow(() -> new NotFoundException(
                        "Bill not found with id: " + billId
                ));

        AccountResponseDTO account = assertCanAccessBill(bill);

        String recipient = account.email();

        if (recipient == null || recipient.isBlank()) {
            throw new IllegalStateException(
                    "Account contact email is missing"
            );
        }

        BigDecimal currentBalance =
                MoneyValidation.checkedBalance(bill.getAmount());

        BigDecimal newBalance =
                MoneyValidation.checkedBalance(
                        currentBalance.add(normalizedAmount)
                );

        bill.setAmount(newBalance);

        outboxService.saveEvent(
                "BILL",
                billId.toString(),
                "DEPOSIT_CREATED",
                new DepositRequestDTO(
                        billId,
                        normalizedAmount,
                        recipient,
                        UUID.randomUUID()
                )
        );

        outboxService.saveEvent(
                "BILL",
                billId.toString(),
                "NOTIFICATION_CREATED",
                new DepositRequestDTO(
                        billId,
                        normalizedAmount,
                        recipient,
                        UUID.randomUUID()
                )
        );

        return new BillDepositResponseDTO(
                bill.getBillId(),
                bill.getAccountId(),
                bill.getAmount(),
                recipient,
                bill.getIsDefault(),
                bill.getOverdraftEnabled(),
                bill.getCreationDate()
        );
    }

    private void assertSandboxDepositAllowed() {
        if (!sandboxDepositsEnabled) {
            throw new ForbiddenException(
                    "Sandbox deposits are disabled"
            );
        }

        if (!authenticatedUser.hasRole(BankRoles.ADMIN)
                && !authenticatedUser.hasRole(BankRoles.EMPLOYEE)) {
            throw new ForbiddenException(
                    "Sandbox deposits require employee or admin role"
            );
        }
    }

    private List<Long> saveBillsForAccount(
            Long accountId,
            List<CreateBillRequestDTO> bills
    ) {
        List<Bill> billsToSave = bills.stream()
                .map(ignored -> new Bill(
                        accountId,
                        new BigDecimal("0.00"),
                        false
                ))
                .collect(Collectors.toList());

        if (!billRepository.existsBillByAccountId(accountId)) {
            billsToSave.get(0).setIsDefault(true);
        }

        return billRepository.saveAll(billsToSave)
                .stream()
                .map(Bill::getBillId)
                .collect(Collectors.toList());
    }

    private Bill getBillById(Long billId) {
        if (billId == null || billId <= 0) {
            throw new BadRequestException("Bill id must be positive");
        }

        return billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException(
                        "Unable to find bill with id: " + billId
                ));
    }

    private AccountResponseDTO assertCanAccessAccount(Long accountId) {
        AccountResponseDTO account =
                accountQueryGateway.getAccount(accountId);

        if (authenticatedUser.hasRole(BankRoles.ADMIN)
                || authenticatedUser.hasRole(BankRoles.EMPLOYEE)) {
            return account;
        }

        if (authenticatedUser.hasRole(BankRoles.CUSTOMER)
                && authenticatedUser.subject()
                .equals(account.ownerSubject())) {
            return account;
        }

        throw new ForbiddenException(
                "Access to this account's bills is denied"
        );
    }

    private AccountResponseDTO assertCanAccessBill(Bill bill) {
        return assertCanAccessAccount(bill.getAccountId());
    }

    private BillResponseDTO toResponse(Bill bill) {
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