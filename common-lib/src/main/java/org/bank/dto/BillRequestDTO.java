package org.bank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

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

    public Long getAccountId() {
        return accountId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public OffsetDateTime getCreationDate() {
        return creationDate;
    }

    public Boolean getOverdraftEnabled() {
        return overdraftEnabled;
    }
}
