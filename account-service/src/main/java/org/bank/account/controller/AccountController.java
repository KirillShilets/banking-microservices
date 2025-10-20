package org.bank.account.controller;

import jakarta.validation.Valid;
import org.bank.account.controller.dto.AccountRequestDTO;
import org.bank.account.controller.dto.AccountResponseDTO;
import org.bank.account.controller.dto.UpdateAccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.service.AccountService;
import org.bank.account.service.AccountServiceImpl;
import org.bank.dto.BillRequestDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/accounts")
public class AccountController {

    private final AccountService accountService;

    @Autowired
    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping("/{accountId}")
    public AccountResponseDTO getAccount(@PathVariable Long accountId) {
        return new AccountResponseDTO(accountService.getAccountById(accountId));
    }

    @PostMapping()
    public Long createAccount(@Valid @RequestBody AccountRequestDTO accountRequestDTO) {
        return accountService.createAccount(accountRequestDTO.getName(), accountRequestDTO.getEmail(),
                accountRequestDTO.getPhone(), accountRequestDTO.getBills());
    }

    @PutMapping("/{accountId}")
    public UpdateAccountResponseDTO updateAccount(@PathVariable Long accountId,
                                                  @Valid @RequestBody UpdateAccountRequestDTO updateAccountRequestDTO) {
        return new UpdateAccountResponseDTO(accountService.updateAccount(accountId,
                updateAccountRequestDTO.getName(), updateAccountRequestDTO.getEmail(),
                updateAccountRequestDTO.getPhone()));
    }

    @DeleteMapping("/{accountId}")
    public AccountResponseDTO deleteAccount(@PathVariable Long accountId) {
        return new AccountResponseDTO(accountService.deleteAccount(accountId));
    }
}
