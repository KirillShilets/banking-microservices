package org.bank.messaging.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.messaging.RabbitCommandPublisher;
import org.bank.messaging.RabbitTopology;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RabbitMessagingConfiguration {

    @Bean
    public TopicExchange internalExchange() {
        return new TopicExchange(
                RabbitTopology.INTERNAL_EXCHANGE,
                true,
                false
        );
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(
                RabbitTopology.DEAD_LETTER_EXCHANGE,
                true,
                false
        );
    }

    @Bean
    public Queue billCreateForAccountQueue() {
        return deadLetteredQueue(
                RabbitTopology.BILL_CREATE_FOR_ACCOUNT_QUEUE,
                RabbitTopology.BILL_CREATE_FOR_ACCOUNT_ROUTING_KEY
        );
    }

    @Bean
    public Queue billDeleteByAccountQueue() {
        return deadLetteredQueue(
                RabbitTopology.BILL_DELETE_BY_ACCOUNT_QUEUE,
                RabbitTopology.BILL_DELETE_BY_ACCOUNT_ROUTING_KEY
        );
    }

    @Bean
    public Queue depositSaveQueue() {
        return deadLetteredQueue(
                RabbitTopology.DEPOSIT_SAVE_QUEUE,
                RabbitTopology.DEPOSIT_SAVE_ROUTING_KEY
        );
    }

    @Bean
    public Queue notificationDepositQueue() {
        return deadLetteredQueue(
                RabbitTopology.NOTIFICATION_DEPOSIT_QUEUE,
                RabbitTopology.NOTIFICATION_DEPOSIT_ROUTING_KEY
        );
    }

    @Bean
    public Queue accountQueryQueue() {
        return deadLetteredQueue(
                RabbitTopology.ACCOUNT_QUERY_QUEUE,
                RabbitTopology.ACCOUNT_QUERY_ROUTING_KEY
        );
    }

    @Bean
    public Queue billCreateForAccountDlq() {
        return QueueBuilder
                .durable(RabbitTopology.BILL_CREATE_FOR_ACCOUNT_DLQ)
                .build();
    }

    @Bean
    public Queue billDeleteByAccountDlq() {
        return QueueBuilder
                .durable(RabbitTopology.BILL_DELETE_BY_ACCOUNT_DLQ)
                .build();
    }

    @Bean
    public Queue depositSaveDlq() {
        return QueueBuilder
                .durable(RabbitTopology.DEPOSIT_SAVE_DLQ)
                .build();
    }

    @Bean
    public Queue notificationDepositDlq() {
        return QueueBuilder
                .durable(RabbitTopology.NOTIFICATION_DEPOSIT_DLQ)
                .build();
    }

    @Bean
    public Queue accountQueryDlq() {
        return QueueBuilder
                .durable(RabbitTopology.ACCOUNT_QUERY_DLQ)
                .build();
    }

    @Bean
    public Binding billCreateForAccountDlqBinding(
            @Qualifier("billCreateForAccountDlq") Queue queue,
            DirectExchange deadLetterExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(deadLetterExchange)
                .with(RabbitTopology.BILL_CREATE_FOR_ACCOUNT_ROUTING_KEY);
    }

    @Bean
    public Binding billDeleteByAccountDlqBinding(
            @Qualifier("billDeleteByAccountDlq") Queue queue,
            DirectExchange deadLetterExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(deadLetterExchange)
                .with(RabbitTopology.BILL_DELETE_BY_ACCOUNT_ROUTING_KEY);
    }

    @Bean
    public Binding depositSaveDlqBinding(
            @Qualifier("depositSaveDlq") Queue queue,
            DirectExchange deadLetterExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(deadLetterExchange)
                .with(RabbitTopology.DEPOSIT_SAVE_ROUTING_KEY);
    }

    @Bean
    public Binding notificationDepositDlqBinding(
            @Qualifier("notificationDepositDlq") Queue queue,
            DirectExchange deadLetterExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(deadLetterExchange)
                .with(RabbitTopology.NOTIFICATION_DEPOSIT_ROUTING_KEY);
    }

    @Bean
    public Binding accountQueryDlqBinding(
            @Qualifier("accountQueryDlq") Queue queue,
            DirectExchange deadLetterExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(deadLetterExchange)
                .with(RabbitTopology.ACCOUNT_QUERY_ROUTING_KEY);
    }

    @Bean
    public Binding billCreateForAccountBinding(
            @Qualifier("billCreateForAccountQueue") Queue queue,
            TopicExchange internalExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(internalExchange)
                .with(RabbitTopology.BILL_CREATE_FOR_ACCOUNT_ROUTING_KEY);
    }

    @Bean
    public Binding billDeleteByAccountBinding(
            @Qualifier("billDeleteByAccountQueue") Queue queue,
            TopicExchange internalExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(internalExchange)
                .with(RabbitTopology.BILL_DELETE_BY_ACCOUNT_ROUTING_KEY);
    }

    @Bean
    public Binding depositSaveBinding(
            @Qualifier("depositSaveQueue") Queue queue,
            TopicExchange internalExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(internalExchange)
                .with(RabbitTopology.DEPOSIT_SAVE_ROUTING_KEY);
    }

    @Bean
    public Binding notificationDepositBinding(
            @Qualifier("notificationDepositQueue") Queue queue,
            TopicExchange internalExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(internalExchange)
                .with(RabbitTopology.NOTIFICATION_DEPOSIT_ROUTING_KEY);
    }

    @Bean
    public Binding accountQueryBinding(
            @Qualifier("accountQueryQueue") Queue queue,
            TopicExchange internalExchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(internalExchange)
                .with(RabbitTopology.ACCOUNT_QUERY_ROUTING_KEY);
    }

    @Bean
    public MessageConverter rabbitMessageConverter(
            ObjectProvider<ObjectMapper> objectMapperProvider
    ) {
        ObjectMapper objectMapper =
                objectMapperProvider.getIfAvailable(ObjectMapper::new);

        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    @ConditionalOnBean(ConnectionFactory.class)
    public RabbitTemplate rabbitTemplate(
            ConnectionFactory connectionFactory,
            MessageConverter rabbitMessageConverter,
            @Value("${app.messaging.rpc.account.timeout-ms:5000}")
            long accountRpcTimeoutMs
    ) {
        RabbitTemplate rabbitTemplate =
                new RabbitTemplate(connectionFactory);

        rabbitTemplate.setMessageConverter(rabbitMessageConverter);
        rabbitTemplate.setReplyTimeout(accountRpcTimeoutMs);
        rabbitTemplate.setMandatory(true);

        return rabbitTemplate;
    }

    @Bean
    public RabbitCommandPublisher rabbitCommandPublisher(
            ObjectProvider<RabbitTemplate> rabbitTemplateProvider,
            @Value("${spring.rabbitmq.publisher-confirm-timeout:5s}")
            Duration confirmationTimeout
    ) {
        return new RabbitCommandPublisher(
                rabbitTemplateProvider,
                confirmationTimeout
        );
    }

    private Queue deadLetteredQueue(
            String queueName,
            String routingKey
    ) {
        return QueueBuilder
                .durable(queueName)
                .deadLetterExchange(
                        RabbitTopology.DEAD_LETTER_EXCHANGE
                )
                .deadLetterRoutingKey(routingKey)
                .build();
    }
}
