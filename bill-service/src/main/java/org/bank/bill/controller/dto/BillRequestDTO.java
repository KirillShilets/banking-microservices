package org.bank.bill.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
public class BillRequestDTO {

    @NotNull(message = "Account id is required")
    private Long accountId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "IsDefault must be specified")
    private Boolean isDefault;

    @PastOrPresent(message = "Creation date cannot be in the future")
    private OffsetDateTime creationDate;

    @NotNull(message = "OverdraftEnabled must be specified")
    private Boolean overdraftEnabled;
}
