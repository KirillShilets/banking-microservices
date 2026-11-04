package org.bank.bill.service;

import org.bank.bill.config.DepositProperties;
import org.bank.bill.config.SandboxProperties;
import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.ForbiddenException;
import org.bank.exception.NotFoundException;
import org.bank.exception.UnprocessableEntityException;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
import org.bank.validation.BillOpeningValidator;
import org.bank.validation.MoneyValidation;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Orchestrates bill use cases and answers "may this caller touch it?".
 *
 * <p>Authorization uses the {@code owner_subject} projection stored on the bill
 * whenever it is present, so no remote call is needed to decide access. Methods
 * that still need account-service (to learn the owner of a legacy bill or the
 * contact email for a notification) deliberately run outside a transaction: the
 * transactional cores live in {@link BillOpeningExecutor} and
 * {@link BillDepositExecutor}.
 */
@Service
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final AccountQueryGateway accountQueryGateway;
    private final BillOpeningExecutor billOpeningExecutor;
    private final BillDepositExecutor billDepositExecutor;
    private final AuthenticatedUser authenticatedUser;
    private final DepositProperties depositProperties;
    private final SandboxProperties sandboxProperties;

    public BillServiceImpl(
            BillRepository billRepository,
            AccountQueryGateway accountQueryGateway,
            BillOpeningExecutor billOpeningExecutor,
            BillDepositExecutor billDepositExecutor,
            AuthenticatedUser authenticatedUser,
            DepositProperties depositProperties,
            SandboxProperties sandboxProperties
    ) {
        this.billRepository = billRepository;
        this.accountQueryGateway = accountQueryGateway;
        this.billOpeningExecutor = billOpeningExecutor;
        this.billDepositExecutor = billDepositExecutor;
        this.authenticatedUser = authenticatedUser;
        this.depositProperties = depositProperties;
        this.sandboxProperties = sandboxProperties;
    }

    @Override
    public BillResponseDTO getBill(Long billId) {
        Bill bill = getBillById(billId);
        assertCanAccessBill(bill);

        return toResponse(bill);
    }

    @Override
    public List<BillResponseDTO> getBillsByAccountId(Long accountId) {
        BillOpeningValidator.validateAccountId(accountId);
        assertCanAccessAccount(accountId);

        return billRepository.getBillsByAccountId(accountId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public Long createBill(
            Long accountId,
            BigDecimal amount,
            Boolean overdraftEnabled
    ) {
        BillOpeningValidator.validateAccountId(accountId);
        BillOpeningValidator.validateOpening(amount, overdraftEnabled);

        AccountResponseDTO account = assertCanAccessAccount(accountId);

        return billOpeningExecutor.openBill(accountId, account.ownerSubject());
    }

    @Override
    public List<Long> createBillsForAccount(
            Long accountId,
            List<CreateBillRequestDTO> bills
    ) {
        BillOpeningValidator.validateAccountId(accountId);
        BillOpeningValidator.validateOpenings(bills);

        AccountResponseDTO account = assertCanAccessAccount(accountId);

        return billOpeningExecutor.openBills(
                accountId,
                account.ownerSubject(),
                bills
        );
    }

    @Override
    public List<Long> createBillsForAccountInternal(
            Long accountId,
            String ownerSubject,
            List<CreateBillRequestDTO> bills
    ) {
        BillOpeningValidator.validateAccountId(accountId);
        BillOpeningValidator.validateOpenings(bills);

        return billOpeningExecutor.openBills(accountId, ownerSubject, bills);
    }

    @Override
    public BillDepositResponseDTO depositBill(
            Long billId,
            BigDecimal amount
    ) {
        assertSandboxDepositAllowed();

        if (billId == null || billId <= 0) {
            throw new BadRequestException("Bill id must be positive");
        }

        BigDecimal normalizedAmount = MoneyValidation.positiveAmount(amount);
        BigDecimal minDepositAmount = depositProperties.minAmount();

        if (normalizedAmount.compareTo(minDepositAmount) < 0) {
            throw new BadRequestException(
                    "Deposit amount is less than minimum: "
                            + minDepositAmount.toPlainString()
            );
        }

        Bill bill = getBillById(billId);
        String recipient = authorizeAndResolveRecipient(bill);

        return billDepositExecutor.applyDeposit(
                billId,
                normalizedAmount,
                recipient
        );
    }

    private void assertSandboxDepositAllowed() {
        if (!sandboxProperties.depositsEnabled()) {
            throw new ForbiddenException(
                    "Sandbox deposits are disabled"
            );
        }

        if (!isStaff()) {
            throw new ForbiddenException(
                    "Sandbox deposits require employee or admin role"
            );
        }
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

    /**
     * Authorizes the caller and returns the address the deposit notification must
     * be sent to. The remote call it may perform happens outside any transaction.
     */
    private String authorizeAndResolveRecipient(Bill bill) {
        String ownerSubject = bill.getOwnerSubject();

        if (ownerSubject == null) {
            return requireContactEmail(
                    assertCanAccessAccount(bill.getAccountId())
            );
        }

        if (!isStaff() && !isOwner(ownerSubject)) {
            throw new ForbiddenException(
                    "Access to this account's bills is denied"
            );
        }

        return requireContactEmail(
                accountQueryGateway.getAccount(bill.getAccountId())
        );
    }

    private void assertCanAccessBill(Bill bill) {
        String ownerSubject = bill.getOwnerSubject();

        if (ownerSubject == null) {
            assertCanAccessAccount(bill.getAccountId());
            return;
        }

        if (!isStaff() && !isOwner(ownerSubject)) {
            throw new ForbiddenException(
                    "Access to this account's bills is denied"
            );
        }
    }

    private AccountResponseDTO assertCanAccessAccount(Long accountId) {
        AccountResponseDTO account = accountQueryGateway.getAccount(accountId);

        if (isStaff() || isOwner(account.ownerSubject())) {
            return account;
        }

        throw new ForbiddenException(
                "Access to this account's bills is denied"
        );
    }

    private boolean isStaff() {
        return authenticatedUser.hasRole(BankRoles.ADMIN)
                || authenticatedUser.hasRole(BankRoles.EMPLOYEE);
    }

    private boolean isOwner(String ownerSubject) {
        return ownerSubject != null
                && authenticatedUser.hasRole(BankRoles.CUSTOMER)
                && authenticatedUser.subject().equals(ownerSubject);
    }

    private static String requireContactEmail(AccountResponseDTO account) {
        String recipient = account.email();

        if (recipient == null || recipient.isBlank()) {
            throw new UnprocessableEntityException(
                    "Account contact email is missing"
            );
        }

        return recipient;
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
