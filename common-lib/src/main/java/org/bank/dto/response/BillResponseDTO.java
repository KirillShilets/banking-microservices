package org.bank.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BillResponseDTO(
        Long billId,
        Long accountId,
        BigDecimal amount,
        Boolean isDefault,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
        OffsetDateTime creationDate,
        Boolean overdraftEnabled
) {}
