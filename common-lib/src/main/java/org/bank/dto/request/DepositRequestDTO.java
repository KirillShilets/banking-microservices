package org.bank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class DepositRequestDTO {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "2.60", message = "Amount must be greater than 2.60")
    private BigDecimal amount;

    @NotNull(message = "Email is required")
    private String email;
}
