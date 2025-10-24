package org.bank.deposit.controller;

import jakarta.validation.Valid;

import org.bank.deposit.service.DepositService;
import org.bank.dto.BillDepositResponseDTO;
import org.bank.dto.DepositRequestDTO;
import org.bank.dto.DepositResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/deposits")
public class DepositController {

    private final DepositService depositService;

    @Autowired
    public DepositController(DepositService depositService) {
        this.depositService = depositService;
    }

    @PostMapping("/{billId}")
    public BillDepositResponseDTO deposit(@PathVariable Long billId, @Valid @RequestBody DepositRequestDTO depositRequestDTO) {
        return depositService.deposit(billId, depositRequestDTO.getAmount(), depositRequestDTO.getEmail());
    }

    @GetMapping("/{depositId}")
    public DepositResponseDTO getDeposit(@PathVariable Long depositId) {
        return depositService.getDeposit(depositId);
    }
}
