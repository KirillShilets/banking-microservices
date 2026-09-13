package org.bank.deposit.controller;

import lombok.RequiredArgsConstructor;
import org.bank.deposit.service.DepositService;
import org.bank.dto.response.DepositResponseDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/deposits")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('employee', 'admin')")
public class DepositController {

    private final DepositService depositService;

    @GetMapping("/{depositId}")
    public ResponseEntity<DepositResponseDTO> getDeposit(@PathVariable Long depositId) {
        return ResponseEntity.ok(
                depositService.getDeposit(depositId)
        );
    }
}