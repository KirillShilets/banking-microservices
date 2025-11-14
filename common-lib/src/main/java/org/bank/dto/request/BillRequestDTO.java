package org.bank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record BillRequestDTO(
        @NotNull(message = "Account id is required") Long accountId,
        @NotNull(message = "Amount is required") @DecimalMin("0.01") BigDecimal amount,
        @NotNull(message = "Overdraft must be specified") Boolean overdraftEnabled
) {}

