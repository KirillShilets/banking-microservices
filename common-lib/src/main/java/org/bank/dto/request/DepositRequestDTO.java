package org.bank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DepositRequestDTO(@NotNull(message = "Bill id is required") Long billId,
                                @NotNull(message = "Amount is required") @DecimalMin(value = "2.60", message = "Amount must be greater than 2.60") BigDecimal amount,
                                @NotNull(message = "Email is required") String email) {}
