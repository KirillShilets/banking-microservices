package org.bank.account.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.messaging.RabbitCommandPublisher;
import org.bank.messaging.RabbitTopology;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
@RequiredArgsConstructor
public class RabbitBillCommandGateway implements BillCommandGateway {

    private final RabbitCommandPublisher commandPublisher;

    @Override
    public void createBillsForAccount(CreateBillsCommandDTO command) {
        Objects.requireNonNull(command, "Create-bills command must not be null");

        commandPublisher.publish(
                RabbitTopology.INTERNAL_EXCHANGE,
                RabbitTopology.BILL_CREATE_FOR_ACCOUNT_ROUTING_KEY,
                command
        );
    }
}