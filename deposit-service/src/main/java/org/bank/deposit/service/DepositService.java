package org.bank.deposit.service;

import org.bank.dto.response.DepositResponseDTO;

import java.math.BigDecimal;

public interface DepositService {
    DepositResponseDTO saveDeposit(Long billId, BigDecimal amount, String email);
    DepositResponseDTO getDeposit(Long depositId);
}
