package org.bank.deposit.handler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.client.BillServiceClient;
import org.bank.deposit.handler.event.DepositEvent;
import org.bank.dto.request.DepositRequestDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor(onConstructor_ = {@Autowired})
@Slf4j
public class DepositEventHandler {
    private final BillServiceClient billServiceClient;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleDeposit(DepositEvent event) {
        log.info("Received deposit event");
        billServiceClient.depositBill(event.billId(), new DepositRequestDTO(event.billId(), event.amount(), event.email()));
    }
}
