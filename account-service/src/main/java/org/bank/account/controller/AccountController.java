package org.bank.account.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.bank.account.controller.dto.AccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.entity.Account;
import org.bank.account.service.AccountService;
import org.bank.dto.response.AccountResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponseDTO> getAccount(@PathVariable Long accountId) {
        return ResponseEntity.ok(accountService.getAccount(accountId));
    }

    @PostMapping
    public ResponseEntity<Long> createAccount(@Valid @RequestBody AccountRequestDTO dto) {
        Long accountId = accountService.createAccount(dto.name(), dto.email(), dto.phone(), dto.bills());
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequestUri()
                .path("/{id}")
                .buildAndExpand(accountId)
                .toUri();
        return ResponseEntity.created(location).body(accountId);
    }


    @PutMapping("/{accountId}")
    public ResponseEntity<UpdateAccountResponseDTO> updateAccount(@PathVariable Long accountId,
                                                                  @Valid @RequestBody UpdateAccountRequestDTO updateAccountRequestDTO) {
        return ResponseEntity.ok(accountService.updateAccount(accountId, updateAccountRequestDTO.name(), updateAccountRequestDTO.email(), updateAccountRequestDTO.phone()));
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<Void> deleteAccount(@PathVariable Long accountId) {
        accountService.deleteAccount(accountId);
        return ResponseEntity.noContent().build();
    }
}
