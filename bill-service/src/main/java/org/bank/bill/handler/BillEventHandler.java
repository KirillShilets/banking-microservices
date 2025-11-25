package org.bank.bill.handler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.bill.handler.event.DepositEvent;
import org.bank.client.DepositServiceClient;
import org.bank.dto.request.DepositRequestDTO;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class BillEventHandler {
    private final DepositServiceClient depositServiceClient;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleDepositEvent(DepositEvent event) {
        log.info("Received deposit event");
        try {
            depositServiceClient.saveDeposit(new DepositRequestDTO(event.billId(), event.amount(), event.email()));
            log.info("Successfully sent deposit info to DepositService");
        } catch (Exception e) {
            log.error("Failed to sync deposit to DepositService after retries. " +
                    "Error: {}", e.getMessage());
        }
    }
}
