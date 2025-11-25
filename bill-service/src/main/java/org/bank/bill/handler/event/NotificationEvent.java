package org.bank.bill.handler.event;

import java.math.BigDecimal;

public record NotificationEvent(Long billId, BigDecimal amount, String email) {
}
