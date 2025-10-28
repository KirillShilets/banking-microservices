package org.bank.notification.controller.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepositNotificationRequestDTO {

    @NotNull
    @Positive
    private BigDecimal amount;

    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    @Size(max = 127, message = "Email must be less 127 characters long")
    private String email;
}
