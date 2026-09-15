package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.messaging.RabbitCommandPublisher;
import org.bank.messaging.RabbitTopology;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
@RequiredArgsConstructor
public class RabbitDepositCommandGateway
        implements DepositCommandGateway {

    private final RabbitCommandPublisher commandPublisher;

    @Override
    public void saveDeposit(DepositRequestDTO request) {
        Objects.requireNonNull(
                request,
                "Deposit command must not be null"
        );

        commandPublisher.publish(
                RabbitTopology.INTERNAL_EXCHANGE,
                RabbitTopology.DEPOSIT_SAVE_ROUTING_KEY,
                request
        );
    }
}