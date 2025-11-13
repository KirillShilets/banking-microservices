package org.bank.notification.service.dto;

import java.math.BigDecimal;

public record DepositResponseDTO(
        BigDecimal amount,
        String email
) {}
