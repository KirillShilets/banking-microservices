package org.bank.account.controller;

import jakarta.validation.Valid;
import org.bank.account.controller.dto.AccountRequestDTO;
import org.bank.account.controller.dto.AccountResponseDTO;
import org.bank.account.service.AccountService;
import org.bank.account.service.AccountServiceImpl;
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
    public AccountResponseDTO updateAccount(@PathVariable Long accountId,
                                            @Valid @RequestBody AccountRequestDTO accountRequestDTO) {
        return new AccountResponseDTO(accountService.updateAccount(accountId,
                accountRequestDTO.getName(), accountRequestDTO.getEmail(),
                accountRequestDTO.getPhone(), accountRequestDTO.getBills()));
    }

    @DeleteMapping("/{accountId}")
    public AccountResponseDTO deleteAccount(@PathVariable Long accountId) {
        return new AccountResponseDTO(accountService.deleteAccount(accountId));
    }
}
