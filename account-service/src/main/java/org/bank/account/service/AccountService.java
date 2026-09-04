package org.bank.account.service;

import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.entity.Account;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;

import java.util.List;

public interface AccountService {
    AccountResponseDTO getAccount(Long accountId);
    AccountResponseDTO getCurrentAccount();
    Long createAccount(String name, String email, String phone, List<CreateBillRequestDTO> bills);
    UpdateAccountResponseDTO updateAccount(Long accountId, String name, String email, String phone);
    void deleteAccount(Long accountId);
}
