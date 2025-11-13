package org.bank.notification.controller.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record DepositNotificationRequestDTO(
        @NotNull
        @Positive
        BigDecimal amount,
        @Email(message = "Email must be valid")
        @NotBlank(message = "Email is required")
        @Size(max = 127, message = "Email must be less 127 characters long")
        String email
) {}
