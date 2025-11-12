package org.bank.deposit.controller;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import org.bank.deposit.service.DepositService;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.DepositResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/deposits")
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class DepositController {

    private final DepositService depositService;

    @PostMapping("/{billId}")
    public DepositResponseDTO deposit(@PathVariable("billId") Long fromBillId, @Valid @RequestBody DepositRequestDTO depositRequestDTO) {
        return depositService.deposit(fromBillId, depositRequestDTO.getBillId(), depositRequestDTO.getAmount(), depositRequestDTO.getEmail());
    }

    @GetMapping("/{depositId}")
    public DepositResponseDTO getDeposit(@PathVariable Long depositId) {
        return depositService.getDeposit(depositId);
    }
}
