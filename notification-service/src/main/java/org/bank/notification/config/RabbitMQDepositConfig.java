package org.bank.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static org.bank.messaging.RabbitMQConstants.*;

@Configuration
@EnableRabbit
public class RabbitMQDepositConfig {

    @Bean
    public TopicExchange depositExchange() {
        return new TopicExchange(DEPOSIT_EXCHANGE);
    }

    @Bean
    public Queue depositQueue() {
        return new Queue(DEPOSIT_QUEUE);
    }

    @Bean
    public Binding depositBinding() {
        return BindingBuilder
                .bind(depositQueue())
                .to(depositExchange())
                .with(DEPOSIT_ROUTING_KEY);
    }
}
