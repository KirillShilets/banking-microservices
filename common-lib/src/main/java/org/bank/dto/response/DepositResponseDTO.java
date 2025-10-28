package org.bank.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DepositResponseDTO(BigDecimal amount, Long billId,
                                 String email, OffsetDateTime creationDate) {
}
