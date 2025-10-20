package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.bill.service.BillService;
import org.bank.event.BillsCreateEvent;
import org.bank.event.BillsCreatedEvent;
import org.bank.messaging.RabbitMQConstants;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class BillsCreateListener {

    private final BillService billService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = RabbitMQConstants.BILL_QUEUE)
    public void handleBillsCreateEvent(BillsCreateEvent event) {
        List<Long> createdBills = billService.saveBillFromEvent(event);
        BillsCreatedEvent createdEvent = new BillsCreatedEvent(
                event.getEventId(), event.getAccountId(), createdBills
        );
        rabbitTemplate.convertAndSend(RabbitMQConstants.BILL_EXCHANGE, RabbitMQConstants.BILL_ROUTING_KEY, createdEvent);
    }
}
