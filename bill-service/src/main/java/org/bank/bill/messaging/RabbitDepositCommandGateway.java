package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.messaging.RabbitTopology;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RabbitDepositCommandGateway implements DepositCommandGateway {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void saveDeposit(DepositRequestDTO requestDTO) {
        rabbitTemplate.convertAndSend(
                RabbitTopology.INTERNAL_EXCHANGE,
                RabbitTopology.DEPOSIT_SAVE_ROUTING_KEY,
                requestDTO
        );
    }
}
