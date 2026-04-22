package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.bill.service.BillService;
import org.bank.messaging.RabbitTopology;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.bank.messaging.dto.DeleteBillsByAccountCommandDTO;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillAccountCommandListener {

    private final BillService billService;

    @RabbitListener(queues = RabbitTopology.BILL_CREATE_FOR_ACCOUNT_QUEUE)
    public void createBillsForAccount(CreateBillsCommandDTO command) {
        if (command == null || command.accountId() == null || command.bills() == null) {
            log.warn("Skipped invalid create-bills command payload");
            return;
        }

        try {
            billService.createBillsForAccount(command.accountId(), command.bills());
        } catch (RuntimeException ex) {
            log.error("Failed to create bills for accountId={} via RabbitMQ command", command.accountId(), ex);
        }
    }

    @RabbitListener(queues = RabbitTopology.BILL_DELETE_BY_ACCOUNT_QUEUE)
    public void deleteBillsByAccount(DeleteBillsByAccountCommandDTO command) {
        if (command == null || command.accountId() == null) {
            log.warn("Skipped invalid delete-bills command payload");
            return;
        }

        try {
            billService.deleteBillsByAccountId(command.accountId());
        } catch (RuntimeException ex) {
            log.error("Failed to delete bills for accountId={} via RabbitMQ command", command.accountId(), ex);
        }
    }
}
