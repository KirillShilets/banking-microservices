package org.bank.account.handler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.handler.event.AccountCreatedEvent;
import org.bank.account.handler.event.AccountDeletedEvent;
import org.bank.client.BillServiceClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor(onConstructor_ = {@Autowired})
@Slf4j
public class AccountEventHandler {
    private final BillServiceClient billServiceClient;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAccountCreated(AccountCreatedEvent event) {
        log.info("Received account create event");
        billServiceClient.createBillsForAccount(event.accountId(), event.bills());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAccountDeleted(AccountDeletedEvent event) {
        log.info("Received account delete event");
        billServiceClient.deleteBillsByAccountId(event.accountId());
    }
}
