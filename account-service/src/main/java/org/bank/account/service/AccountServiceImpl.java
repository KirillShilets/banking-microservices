package org.bank.account.service;

import org.bank.client.BillServiceClient;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.exception.AccountAlreadyExistsException;
import org.bank.exception.NotFoundException;
import org.bank.account.entity.Account;
import org.bank.account.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final BillServiceClient billServiceClient;

    @Autowired
    public AccountServiceImpl(AccountRepository accountRepository, BillServiceClient billServiceClient) {
        this.accountRepository = accountRepository;
        this.billServiceClient = billServiceClient;
    }

    @Override
    public Account getAccountById(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new NotFoundException("Unable to find account with id: " + accountId));
    }

    @Override
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

        try {
            billServiceClient.createBillsForAccount(accountId, bills);
        } catch (Exception e) {
            throw new IllegalStateException("Could not create bills for the new account. Aborting account creation.", e);
        }

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
    public AccountResponseDTO deleteAccount(Long accountId) {
        Account accountToDelete = getAccountById(accountId);
        accountRepository.delete(accountToDelete);
        List<BillResponseDTO> billsForDelete= billServiceClient.getBillsByAccountId(accountId);
        billsForDelete.forEach(bill -> billServiceClient.deleteBill(bill.getBillId()));

        return new AccountResponseDTO(accountToDelete.getName(), accountToDelete.getEmail(),
                accountToDelete.getPhone(), OffsetDateTime.now());
    }
}
