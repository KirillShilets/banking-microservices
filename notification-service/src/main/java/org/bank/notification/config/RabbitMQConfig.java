package org.bank.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRabbit
public class RabbitMQConfig {

    public static final String DEPOSIT_QUEUE = "deposit.queue";
    private static final String DEPOSIT_EXCHANGE = "deposit.exchange";
    private static final String DEPOSIT_ROUTING_KEY = "deposit.routing.key";

    @Autowired
    private AmqpAdmin amqpAdmin;

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
