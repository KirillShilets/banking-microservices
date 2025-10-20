package org.bank.event;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DepositCreateEvent {
    private Long accountId;
    private Long billId;
    private BigDecimal amount;

    public DepositCreateEvent(Long accountId, Long billId, BigDecimal amount) {
        this.accountId = accountId;
        this.billId = billId;
        this.amount = amount;
    }

    public DepositCreateEvent(){}
}
