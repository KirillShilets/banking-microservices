package org.bank.account.service;

import lombok.RequiredArgsConstructor;
import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.handler.event.AccountCreatedEvent;
import org.bank.account.handler.event.AccountDeletedEvent;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.exception.AlreadyExistsException;
import org.bank.exception.NotFoundException;
import org.bank.account.entity.Account;
import org.bank.account.repository.AccountRepository;
import org.bank.security.web.AuthenticatedUser;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AuthenticatedUser authenticatedUser;

    @Override
    @Transactional(readOnly = true)
    public AccountResponseDTO getAccount(Long accountId) {
        Account account = getAccountById(accountId);
        return new AccountResponseDTO(
                account.getOwnerSubject(),
                account.getName(),
                account.getEmail(),
                account.getPhone(),
                account.getCreationDate()
        );
    }

    @Override
    public AccountResponseDTO getCurrentAccount() {
        String subject = authenticatedUser.subject();
        Account account = accountRepository.findByOwnerSubject(subject)
                .orElseThrow(() -> new NotFoundException("Account not found for current user"));
        return toResponse(account);
    }

    @Override
    @Transactional
    public Long createAccount(String name, String email, String phone, List<CreateBillRequestDTO> bills) {
        Account account = new Account(authenticatedUser.subject(), name, email, phone, OffsetDateTime.now());
        try {
            Account savedAccount = accountRepository.save(account);
            Long accountId = savedAccount.getAccountId();
            eventPublisher.publishEvent(new AccountCreatedEvent(account.getAccountId(), bills));
            return accountId;
        } catch (DataIntegrityViolationException ex) {
            throw new AlreadyExistsException("Account with email: " + email + " already exists");
        }
    }

    @Override
    @Transactional
    public UpdateAccountResponseDTO updateAccount(Long accountId, String name, String email, String phone) {
        Account accountToUpdate = getAccountById(accountId);
        accountToUpdate.setName(name);
        accountToUpdate.setEmail(email);
        accountToUpdate.setPhone(phone);
        Account updatedAccount = accountRepository.save(accountToUpdate);
        return new UpdateAccountResponseDTO(updatedAccount.getAccountId(), updatedAccount.getName(), updatedAccount.getEmail(), updatedAccount.getPhone());
    }

    @Override
    @Transactional
    public void deleteAccount(Long accountId) {
        Account account = getAccountById(accountId);
        accountRepository.delete(account);
        eventPublisher.publishEvent(new AccountDeletedEvent(accountId));
    }

    private Account getAccountById(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
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