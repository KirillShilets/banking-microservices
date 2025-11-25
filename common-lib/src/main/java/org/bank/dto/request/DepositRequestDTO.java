package org.bank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DepositRequestDTO(@NotNull(message = "Bill id is required") Long billId,
                                @NotNull(message = "Amount is required") @DecimalMin(value = "0.01") BigDecimal amount,
                                @Email(message = "Email must be valid")  @NotBlank(message = "Email is required") String email) {}
