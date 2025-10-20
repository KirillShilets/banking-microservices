package org.bank.account.service;

import org.bank.account.entity.Account;
import org.bank.dto.CreateBillRequestDTO;

import java.util.List;

public interface AccountService {
    Account getAccountById(Long accountId);
    Long createAccount(String name, String email, String phone, List<CreateBillRequestDTO> bills);
    Account updateAccount(Long accountId, String name, String email, String phone);
    Account deleteAccount(Long accountId);
}
