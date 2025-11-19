package org.bank.deposit.controller;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import org.bank.deposit.service.DepositService;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.DepositResponseDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/deposits")
@RequiredArgsConstructor()
public class DepositController {

    private final DepositService depositService;

    @PostMapping("/{billId}")
    public ResponseEntity<DepositResponseDTO> deposit(@PathVariable("billId") Long fromBillId, @Valid @RequestBody DepositRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(depositService.deposit(fromBillId, dto.billId(), dto.amount(), dto.email()));
    }

    @GetMapping("/{depositId}")
    public ResponseEntity<DepositResponseDTO> getDeposit(@PathVariable Long depositId) {
        return ResponseEntity.ok(depositService.getDeposit(depositId));
    }
}
