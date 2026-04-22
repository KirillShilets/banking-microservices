package org.bank.messaging.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.messaging.RabbitTopology;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMessagingConfiguration {

    @Bean
    public TopicExchange internalExchange() {
        return new TopicExchange(RabbitTopology.INTERNAL_EXCHANGE, true, false);
    }

    @Bean
    public Queue billCreateForAccountQueue() {
        return QueueBuilder.durable(RabbitTopology.BILL_CREATE_FOR_ACCOUNT_QUEUE).build();
    }

    @Bean
    public Queue billDeleteByAccountQueue() {
        return QueueBuilder.durable(RabbitTopology.BILL_DELETE_BY_ACCOUNT_QUEUE).build();
    }

    @Bean
    public Queue depositSaveQueue() {
        return QueueBuilder.durable(RabbitTopology.DEPOSIT_SAVE_QUEUE).build();
    }

    @Bean
    public Queue notificationDepositQueue() {
        return QueueBuilder.durable(RabbitTopology.NOTIFICATION_DEPOSIT_QUEUE).build();
    }

    @Bean
    public Queue accountQueryQueue() {
        return QueueBuilder.durable(RabbitTopology.ACCOUNT_QUERY_QUEUE).build();
    }

    @Bean
    public Binding billCreateForAccountBinding(@Qualifier("billCreateForAccountQueue") Queue billCreateForAccountQueue,
                                               TopicExchange internalExchange) {
        return BindingBuilder.bind(billCreateForAccountQueue)
                .to(internalExchange)
                .with(RabbitTopology.BILL_CREATE_FOR_ACCOUNT_ROUTING_KEY);
    }

    @Bean
    public Binding billDeleteByAccountBinding(@Qualifier("billDeleteByAccountQueue") Queue billDeleteByAccountQueue,
                                              TopicExchange internalExchange) {
        return BindingBuilder.bind(billDeleteByAccountQueue)
                .to(internalExchange)
                .with(RabbitTopology.BILL_DELETE_BY_ACCOUNT_ROUTING_KEY);
    }

    @Bean
    public Binding depositSaveBinding(@Qualifier("depositSaveQueue") Queue depositSaveQueue,
                                      TopicExchange internalExchange) {
        return BindingBuilder.bind(depositSaveQueue)
                .to(internalExchange)
                .with(RabbitTopology.DEPOSIT_SAVE_ROUTING_KEY);
    }

    @Bean
    public Binding notificationDepositBinding(@Qualifier("notificationDepositQueue") Queue notificationDepositQueue,
                                              TopicExchange internalExchange) {
        return BindingBuilder.bind(notificationDepositQueue)
                .to(internalExchange)
                .with(RabbitTopology.NOTIFICATION_DEPOSIT_ROUTING_KEY);
    }

    @Bean
    public Binding accountQueryBinding(@Qualifier("accountQueryQueue") Queue accountQueryQueue,
                                       TopicExchange internalExchange) {
        return BindingBuilder.bind(accountQueryQueue)
                .to(internalExchange)
                .with(RabbitTopology.ACCOUNT_QUERY_ROUTING_KEY);
    }

    @Bean
    public MessageConverter rabbitMessageConverter(ObjectProvider<ObjectMapper> objectMapperProvider) {
        ObjectMapper objectMapper = objectMapperProvider.getIfAvailable(ObjectMapper::new);
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    @ConditionalOnBean(ConnectionFactory.class)
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter rabbitMessageConverter,
                                         @Value("${app.messaging.rpc.account.timeout-ms:5000}") long accountRpcTimeoutMs) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(rabbitMessageConverter);
        rabbitTemplate.setReplyTimeout(accountRpcTimeoutMs);
        return rabbitTemplate;
    }
}
