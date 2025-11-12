package org.bank.account.service;

import lombok.RequiredArgsConstructor;
import org.bank.account.handler.event.AccountCreatedEvent;
import org.bank.account.handler.event.AccountDeletedEvent;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.exception.AccountAlreadyExistsException;
import org.bank.exception.NotFoundException;
import org.bank.account.entity.Account;
import org.bank.account.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor(onConstructor_ = {@Autowired})
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public Account getAccountById(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponseDTO getAccount(Long accountId) {
        Account account = getAccountById(accountId);
        return new AccountResponseDTO(
                account.getName(),
                account.getEmail(),
                account.getPhone(),
                account.getCreationDate()
        );
    }

    @Override
    @Transactional
    public Long createAccount(String name, String email, String phone, List<CreateBillRequestDTO> bills) {
        Account account = new Account(name, email, phone, OffsetDateTime.now());
        if(accountRepository.existsByEmail(email)) {
            throw new AccountAlreadyExistsException("Account with email: " + email + " already exists");
        }
        Account savedAccount = accountRepository.save(account);
        Long accountId = savedAccount.getAccountId();

        eventPublisher.publishEvent(new AccountCreatedEvent(account.getAccountId(), bills));

        return accountId;
    }

    @Override
    @Transactional
    public Account updateAccount(Long accountId, String name, String email, String phone) {
        Account accountToUpdate = getAccountById(accountId);
        accountToUpdate.setName(name);
        accountToUpdate.setEmail(email);
        accountToUpdate.setPhone(phone);
        return accountRepository.save(accountToUpdate);
    }

    @Override
    @Transactional
    public void deleteAccount(Long accountId) {
        if(!accountRepository.existsById(accountId)) {
            throw new NotFoundException("Unable to find account with id: " + accountId);
        }
        accountRepository.deleteAccountById(accountId);
        eventPublisher.publishEvent(new AccountDeletedEvent(accountId));
    }
}