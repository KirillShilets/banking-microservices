package org.bank.account.config;

import org.bank.messaging.RabbitMQConstants;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRabbit
public class RabbitMQBillConfig {

    @Bean
    public TopicExchange billExchange() {
        return ExchangeBuilder
                .topicExchange(RabbitMQConstants.BILL_EXCHANGE)
                .durable(true)
                .build();
    }

    @Bean
    public TopicExchange billDlqExchange() {
        return ExchangeBuilder
                .topicExchange(RabbitMQConstants.BILL_DLQ_EXCHANGE)
                .durable(true)
                .build();
    }

    @Bean
    public Queue billQueue() {
        return QueueBuilder.durable(RabbitMQConstants.BILL_QUEUE)
                .withArgument("x-dead-letter-exchange", RabbitMQConstants.BILL_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RabbitMQConstants.BILL_DLQ_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue billDlqQueue() {
        return QueueBuilder.durable(RabbitMQConstants.BILL_DLQ_QUEUE).build();
    }

    @Bean
    public Binding billBinding(Queue billQueue, TopicExchange billExchange) {
        return BindingBuilder.bind(billQueue)
                .to(billExchange)
                .with(RabbitMQConstants.BILL_ROUTING_KEY);
    }

    @Bean
    public Binding billDlqBinding(Queue billDlqQueue, TopicExchange billDlqExchange) {
        return BindingBuilder.bind(billDlqQueue)
                .to(billDlqExchange)
                .with(RabbitMQConstants.BILL_DLQ_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter jsonMessageConverter) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter);
        return rabbitTemplate;
    }
}
