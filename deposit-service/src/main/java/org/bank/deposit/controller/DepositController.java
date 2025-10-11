package org.bank.deposit.controller;

import org.bank.deposit.controller.dto.DepositRequestDTO;
import org.bank.deposit.controller.dto.DepositResponseDTO;
import org.bank.deposit.service.DepositService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DepositController {

    private final DepositService depositService;

    public DepositController(DepositService depositService) {
        this.depositService = depositService;
    }

    @PostMapping("/deposits")
    public DepositResponseDTO deposit(@RequestBody DepositRequestDTO depositRequestDTO) {
        return depositService.deposit(depositRequestDTO.getAccountId(), depositRequestDTO.getBillId(),
                depositRequestDTO.getAmount());
    }
}
