package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.messaging.RabbitTopology;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RabbitNotificationCommandGateway implements NotificationCommandGateway {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void sendDepositNotification(DepositRequestDTO requestDTO) {
        rabbitTemplate.convertAndSend(
                RabbitTopology.INTERNAL_EXCHANGE,
                RabbitTopology.NOTIFICATION_DEPOSIT_ROUTING_KEY,
                requestDTO
        );
    }
}
