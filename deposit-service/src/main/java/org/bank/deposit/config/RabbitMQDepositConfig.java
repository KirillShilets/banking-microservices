package org.bank.deposit.config;

import org.bank.messaging.RabbitMQConstants;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRabbit
public class RabbitMQDepositConfig {

    @Bean
    public TopicExchange depositExchange() {
        return new TopicExchange(RabbitMQConstants.DEPOSIT_EXCHANGE);
    }

    @Bean
    public Queue depositQueue() {
        return new Queue(RabbitMQConstants.DEPOSIT_QUEUE);
    }

    @Bean
    public Binding depositBinding() {
        return BindingBuilder
                .bind(depositQueue())
                .to(depositExchange())
                .with(RabbitMQConstants.DEPOSIT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter());
        return rabbitTemplate;
    }
}
