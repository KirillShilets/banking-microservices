package org.bank.messaging;

public final class RabbitMQConstants {
    public static final String BILL_EXCHANGE = "bill.exchange";
    public static final String BILL_QUEUE = "bill.queue";
    public static final String BILL_ROUTING_KEY = "bill.routing.key";

    public static final String BILL_DLQ_EXCHANGE = "bill.dlq.exchange";
    public static final String BILL_DLQ_QUEUE = "bill.dlq.queue";
    public static final String BILL_DLQ_ROUTING_KEY = "bill.dlq.routing.key";

    public static final String DEPOSIT_EXCHANGE = "deposit.exchange";
    public static final String DEPOSIT_QUEUE = "deposit.queue";
    public static final String DEPOSIT_ROUTING_KEY = "deposit.routing.key";
}
