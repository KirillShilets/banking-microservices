package org.bank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CreateBillRequestDTO {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "IsDefault must be specified")
    private Boolean isDefault;

    @NotNull(message = "OverdraftEnabled must be specified")
    private Boolean overdraftEnabled;

    public BigDecimal getAmount() {
        return amount;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public Boolean getOverdraftEnabled() {
        return overdraftEnabled;
    }
}
