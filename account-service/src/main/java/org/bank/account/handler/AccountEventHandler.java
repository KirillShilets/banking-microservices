package org.bank.account.handler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.handler.event.AccountCreatedEvent;
import org.bank.account.handler.event.AccountDeletedEvent;
import org.bank.account.messaging.BillCommandGateway;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccountEventHandler {

    private final BillCommandGateway billCommandGateway;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAccountCreated(AccountCreatedEvent event) {
        log.info("Received account create event");
        try {
            billCommandGateway.createBillsForAccount(event.accountId(), event.bills());
            log.info("Bills creation request sent successfully");
        } catch (Exception e) {
            log.error("Failed to create bills for account {}. Reason: {}", event.accountId(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAccountDeleted(AccountDeletedEvent event) {
        log.info("Received account delete event");
        try {
            billCommandGateway.deleteBillsByAccountId(event.accountId());
        } catch (Exception e) {
            log.error("Failed to delete bills for account {}. Reason: {}", event.accountId(), e.getMessage());
        }
    }
}
