package org.bank.deposit.messaging;

import org.bank.event.DepositCreateEvent;
import org.bank.messaging.RabbitMQConstants;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class DepositProducer {

    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public DepositProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void sendDepositCreatedEvent(DepositCreateEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitMQConstants.DEPOSIT_EXCHANGE,
                RabbitMQConstants.DEPOSIT_ROUTING_KEY,
                event
        );
    }
}
