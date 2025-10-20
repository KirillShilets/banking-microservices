package org.bank.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class BillDepositResponseDTO {
    private Long billId;
    private Long accountId;
    private BigDecimal amount;
    private Boolean isDefault;
    private OffsetDateTime createdDate;
    private Boolean overdraftEnabled;
}
