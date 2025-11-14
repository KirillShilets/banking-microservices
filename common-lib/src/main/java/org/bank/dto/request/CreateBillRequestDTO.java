package org.bank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateBillRequestDTO(@NotNull(message = "Amount is required")
                                   @DecimalMin(value = "0.01", message = "Amount must be greater than 0")  BigDecimal amount,
                                   @NotNull(message = "Overdraft must be specified") Boolean overdraftEnabled) {}
