package org.bank.account.service;

import org.bank.dto.CreateBillRequestDTO;
import org.bank.account.messaging.BillsProducer;
import org.bank.event.BillsCreateEvent;
import org.bank.exception.NotFoundException;
import org.bank.account.entity.Account;
import org.bank.account.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final BillsProducer billsProducer;
    private final PlatformTransactionManager transactionManager;

    @Autowired
    public AccountServiceImpl(AccountRepository accountRepository, BillsProducer billsProducer, PlatformTransactionManager transactionManager) {
        this.accountRepository = accountRepository;
        this.billsProducer = billsProducer;
        this.transactionManager = transactionManager;
    }

    public Account getAccountById(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
    }

    @Transactional
    public Long createAccount(String name, String email, String phone, List<CreateBillRequestDTO> bills) {
        Account account = accountRepository.save(new Account(name, email, phone, OffsetDateTime.now(), null));
        BillsCreateEvent event = new BillsCreateEvent(account.getAccountId(), bills);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                billsProducer.sendBillsCreateEvent(event);
            }
        });

        return account.getAccountId();
    }

    public Account updateAccount(Long accountId, String name,
                                 String email, String phone) {
        Account accountToUpdate = getAccountById(accountId);
        accountToUpdate.setAccountId(accountId);
        accountToUpdate.setName(name);
        accountToUpdate.setEmail(email);
        accountToUpdate.setPhone(phone);

        return accountRepository.save(accountToUpdate);
    }

    public Account deleteAccount(Long accountId) {
        Account deletedAccount = accountRepository.findAccountWithBills(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
        accountRepository.delete(deletedAccount);
        return deletedAccount;
    }
}
