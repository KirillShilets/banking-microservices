package org.bank.account.messaging;

import org.bank.account.entity.Account;
import org.bank.account.repository.AccountRepository;
import org.bank.event.BillsCreatedEvent;
import org.bank.messaging.RabbitMQConstants;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Component
public class BillsCreatedListener {

    private final AccountRepository accountRepository;

    @Autowired
    public BillsCreatedListener(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @RabbitListener(queues = RabbitMQConstants.BILL_QUEUE)
    @Transactional
    public void handleBillsCreated(BillsCreatedEvent event) {
        Account account = accountRepository.findById(event.accountId())
                .orElseThrow(() -> new IllegalStateException("Account not found: " + event.accountId()));

        List<Long> bills = account.getBills();
        if (bills == null) {
            bills = new ArrayList<>();
            account.setBills(bills);
        }

        for (Long bid : event.billIds()) {
            if (!bills.contains(bid)) {
                bills.add(bid);
            }
        }
        accountRepository.save(account);
    }
}
