package org.bank.deposit.handler.event;

import java.math.BigDecimal;

public record DepositEvent(Long billId, BigDecimal amount, String email) {
}
