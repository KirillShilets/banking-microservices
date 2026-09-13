package org.bank.deposit.service;

import org.bank.dto.response.DepositResponseDTO;

import java.math.BigDecimal;
import java.util.UUID;

public interface DepositService {
    DepositResponseDTO saveDeposit(Long billId, BigDecimal amount, String email, UUID messageId);
    DepositResponseDTO getDeposit(Long depositId);
}
