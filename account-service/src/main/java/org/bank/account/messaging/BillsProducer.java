package org.bank.account.messaging;

import org.bank.event.BillsCreateEvent;
import org.bank.messaging.RabbitMQConstants;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class BillsProducer {
    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public BillsProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void sendBillsCreateEvent(BillsCreateEvent event) {
        rabbitTemplate.convertAndSend(RabbitMQConstants.BILL_EXCHANGE,
                RabbitMQConstants.BILL_ROUTING_KEY,
                event);
    }
}
