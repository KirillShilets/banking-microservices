package org.bank.account.service;

import org.bank.exception.NotFoundException;
import org.bank.account.entity.Account;
import org.bank.account.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;

    @Autowired
    public AccountServiceImpl(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public Account getAccountById(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
    }

    public Long createAccount(String name, String email, String phone, List<Long> bills) {
        Account account = new Account(name, email, phone, OffsetDateTime.now(), bills);
        return accountRepository.save(account).getAccountId();
    }

    public Account updateAccount(Long accountId, String name,
                                 String email, String phone, List<Long> bills) {
        Account accountToUpdate = getAccountById(accountId);
        accountToUpdate.setAccountId(accountId);
        accountToUpdate.setName(name);
        accountToUpdate.setEmail(email);
        accountToUpdate.setPhone(phone);
        accountToUpdate.setBills(bills);

        return accountRepository.save(accountToUpdate);
    }

    public Account deleteAccount(Long accountId) {
        Account deletedAccount = accountRepository.findAccountWithBills(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
        accountRepository.delete(deletedAccount);
        return deletedAccount;
    }
}
