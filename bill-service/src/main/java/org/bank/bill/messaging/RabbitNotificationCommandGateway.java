package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.messaging.RabbitCommandPublisher;
import org.bank.messaging.RabbitTopology;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
@RequiredArgsConstructor
public class RabbitNotificationCommandGateway
        implements NotificationCommandGateway {

    private final RabbitCommandPublisher commandPublisher;

    @Override
    public void sendDepositNotification(DepositRequestDTO request) {
        Objects.requireNonNull(
                request,
                "Notification command must not be null"
        );

        commandPublisher.publish(
                RabbitTopology.INTERNAL_EXCHANGE,
                RabbitTopology.NOTIFICATION_DEPOSIT_ROUTING_KEY,
                request
        );
    }
}