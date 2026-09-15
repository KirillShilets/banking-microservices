package org.bank.messaging;

import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Duration;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class RabbitCommandPublisher {

    private final ObjectProvider<RabbitTemplate> rabbitTemplateProvider;
    private final Duration confirmationTimeout;

    public RabbitCommandPublisher(
            ObjectProvider<RabbitTemplate> rabbitTemplateProvider,
            Duration confirmationTimeout
    ) {
        this.rabbitTemplateProvider = Objects.requireNonNull(rabbitTemplateProvider);
        this.confirmationTimeout = Objects.requireNonNull(confirmationTimeout);

        if (confirmationTimeout.isZero() || confirmationTimeout.isNegative()) {
            throw new IllegalArgumentException(
                    "RabbitMQ confirmation timeout must be positive"
            );
        }
    }

    public void publish(
            String exchange,
            String routingKey,
            Object payload
    ) {
        RabbitTemplate rabbitTemplate = rabbitTemplateProvider.getIfAvailable();
        if (rabbitTemplate == null) {
            throw new IllegalStateException("RabbitTemplate is not configured");
        }

        CorrelationData correlationData =
                new CorrelationData(UUID.randomUUID().toString());

        rabbitTemplate.convertAndSend(
                exchange,
                routingKey,
                payload,
                correlationData
        );

        try {
            CorrelationData.Confirm confirmation =
                    correlationData.getFuture()
                            .get(
                                    confirmationTimeout.toMillis(),
                                    TimeUnit.MILLISECONDS
                            );

            if (confirmation == null || !confirmation.isAck()) {
                String reason = confirmation == null
                        ? "No confirmation received"
                        : confirmation.getReason();

                throw new IllegalStateException(
                        "RabbitMQ negatively acknowledged command: " + reason
                );
            }

            if (correlationData.getReturned() != null) {
                throw new IllegalStateException(
                        "RabbitMQ returned command: "
                                + correlationData.getReturned()
                );
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                    "Interrupted while waiting for RabbitMQ confirmation",
                    exception
            );
        } catch (ExecutionException | TimeoutException exception) {
            throw new IllegalStateException(
                    "RabbitMQ did not confirm the command",
                    exception
            );
        }
    }
}
