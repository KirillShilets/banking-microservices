package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.bill.service.BillService;
import org.bank.messaging.RabbitTopology;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class BillAccountCommandListener {

    private final BillService billService;
    private final ProcessedMessageRepository processedMessageRepository;

    @RabbitListener(queues = RabbitTopology.BILL_CREATE_FOR_ACCOUNT_QUEUE)
    @Transactional
    public void createBillsForAccount(CreateBillsCommandDTO command) {
        if (command == null
                || command.messageId() == null
                || command.accountId() == null
                || command.bills() == null) {
            throw new AmqpRejectAndDontRequeueException(
                    "Invalid create-bills command"
            );
        }

        if (processedMessageRepository.existsById(command.messageId())) {
            return;
        }

        billService.createBillsForAccountInternal(
                command.accountId(),
                command.bills()
        );

        processedMessageRepository.save(
                new ProcessedMessage(command.messageId())
        );
    }

    @RabbitListener(queues = RabbitTopology.BILL_DELETE_BY_ACCOUNT_QUEUE)
    public void rejectLegacyDeleteCommand(org.springframework.amqp.core.Message message) {
        throw new AmqpRejectAndDontRequeueException(
                "Physical bill deletion is no longer supported"
        );
    }
}