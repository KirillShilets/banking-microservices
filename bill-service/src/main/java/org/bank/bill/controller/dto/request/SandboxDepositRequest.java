package org.bank.bill.controller.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record SandboxDepositRequest(
        @NotNull(message = "Bill id is required")
        @Positive(message = "Bill id must be positive")
        Long billId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
        @Digits(
                integer = 17,
                fraction = 2,
                message = "Amount must have at most 17 integer and 2 fractional digits"
        )
        BigDecimal amount
) {
}