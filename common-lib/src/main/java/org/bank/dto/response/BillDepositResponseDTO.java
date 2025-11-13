package org.bank.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BillDepositResponseDTO(
        Long billId,
        Long accountId,
        BigDecimal amount,
        String email,
        Boolean isDefault,
        Boolean overdraftEnabled,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
        OffsetDateTime creationDate
) {}
