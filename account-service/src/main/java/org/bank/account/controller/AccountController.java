package org.bank.account.controller;

import jakarta.validation.Valid;
import org.bank.account.controller.dto.AccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.entity.Account;
import org.bank.account.service.AccountService;
import org.bank.dto.response.AccountResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
        return accountService.getAccount(accountId);
    }

    @PostMapping()
    public Long createAccount(@Valid @RequestBody AccountRequestDTO accountRequestDTO) {
        return accountService.createAccount(accountRequestDTO.name(), accountRequestDTO.email(),
                accountRequestDTO.phone(), accountRequestDTO.bills());
    }

    @PutMapping("/{accountId}")
    public UpdateAccountResponseDTO updateAccount(@PathVariable Long accountId,
                                                  @Valid @RequestBody UpdateAccountRequestDTO updateAccountRequestDTO) {
        return accountService.updateAccount(accountId, updateAccountRequestDTO.name(), updateAccountRequestDTO.email(), updateAccountRequestDTO.phone());
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<Void> deleteAccount(@PathVariable Long accountId) {
        accountService.deleteAccount(accountId);
        return ResponseEntity.noContent().build();
    }
}
