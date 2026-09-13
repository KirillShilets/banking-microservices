package org.bank.dto.request;

import jakarta.validation.constraints.AssertFalse;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record BillRequestDTO(
        @NotNull(message = "Account id is required")
        @Positive(message = "Account id must be a positive number")
        Long accountId,

        @NotNull(message = "Initial balance must be specified")
        @DecimalMin(
                value = "0.00",
                message = "A new bill must have a zero balance"
        )
        @DecimalMax(
                value = "0.00",
                message = "A new bill must have a zero balance"
        )
        BigDecimal amount,

        @NotNull(message = "Overdraft setting must be specified")
        @AssertFalse(
                message = "Overdraft cannot be enabled when opening a bill"
        )
        Boolean overdraftEnabled
) {
}