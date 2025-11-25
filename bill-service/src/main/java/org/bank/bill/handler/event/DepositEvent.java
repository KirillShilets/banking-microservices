package org.bank.bill.handler.event;

import java.math.BigDecimal;

public record DepositEvent(Long billId, BigDecimal amount, String email) {

}
