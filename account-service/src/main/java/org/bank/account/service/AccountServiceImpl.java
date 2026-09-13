package org.bank.account.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.outbox.OutboxService;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.exception.AlreadyExistsException;
import org.bank.exception.ForbiddenException;
import org.bank.exception.NotFoundException;
import org.bank.account.entity.Account;
import org.bank.account.repository.AccountRepository;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.bank.messaging.dto.DeleteBillsByAccountCommandDTO;
import org.bank.validation.BillOpeningValidator;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final AuthenticatedUser authenticatedUser;
    private final OutboxService outboxService;

    @Override
    @Transactional(readOnly = true)
    public AccountResponseDTO getAccount(Long accountId) {
        return toResponse(getAccountForAccess(accountId));
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponseDTO getAccountForInternalUse(Long accountId) {
        return toResponse(getAccountById(accountId));
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponseDTO getCurrentAccount() {
        String subject = authenticatedUser.subject();
        Account account = accountRepository.findByOwnerSubject(subject)
                .orElseThrow(() -> new NotFoundException("Account not found for current user"));
        return toResponse(account);
    }

    @Override
    @Transactional
    public Long createAccount(String name, String email, String phone, List<CreateBillRequestDTO> bills) {
        BillOpeningValidator.validateOpenings(bills);
        String subject = authenticatedUser.subject();
        if (accountRepository.findByOwnerSubject(subject).isPresent()) {
            throw new AlreadyExistsException(
                    "Customer account already exists"
            );
        }

        Account account = new Account(
                subject,
                name,
                email,
                phone,
                OffsetDateTime.now()
        );

        Account savedAccount;
        try {
            savedAccount = accountRepository.save(account);
        } catch (DataIntegrityViolationException exception) {
            log.error("Account creation failed", exception);

            throw new AlreadyExistsException(
                    "Account conflicts with existing account data"
            );
        }

        Long accountId = savedAccount.getAccountId();

        CreateBillsCommandDTO command =
                new CreateBillsCommandDTO(accountId, bills);

        outboxService.saveEvent(
                "ACCOUNT",
                accountId.toString(),
                "ACCOUNT_CREATED",
                command
        );

        log.info(
                "Account created and bill-opening command registered: accountId={}",
                accountId
        );

        return accountId;
    }

    @Override
    @Transactional
    public UpdateAccountResponseDTO updateAccount(Long accountId, String name, String email, String phone) {
        Account accountToUpdate = getAccountForAccess(accountId);
        accountToUpdate.setName(name);
        accountToUpdate.setEmail(email);
        accountToUpdate.setPhone(phone);
        Account updatedAccount = accountRepository.save(accountToUpdate);
        return new UpdateAccountResponseDTO(updatedAccount.getAccountId(), updatedAccount.getName(), updatedAccount.getEmail(), updatedAccount.getPhone());
    }

    private Account getAccountById(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
    }

    private Account getAccountForAccess(Long accountId) {
        Account account = getAccountById(accountId);
        if (authenticatedUser.hasRole(BankRoles.ADMIN)
                || authenticatedUser.hasRole(BankRoles.EMPLOYEE)) {
            return account;
        }
        if (authenticatedUser.hasRole(BankRoles.CUSTOMER)
                && authenticatedUser.subject().equals(account.getOwnerSubject())) {
            return account;
        }
        throw new ForbiddenException("Access to this account is denied");
    }

    private AccountResponseDTO toResponse(Account account) {
        return new AccountResponseDTO(
                account.getOwnerSubject(),
                account.getName(),
                account.getEmail(),
                account.getPhone(),
                account.getCreationDate()
        );
    }
}
