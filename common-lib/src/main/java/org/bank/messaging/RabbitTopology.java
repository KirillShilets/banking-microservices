package org.bank.messaging;

public final class RabbitTopology {

    private RabbitTopology() {
    }

    public static final String INTERNAL_EXCHANGE = "bank.internal.exchange";
    public static final String DEAD_LETTER_EXCHANGE = "bank.internal.dlx";

    public static final String BILL_CREATE_FOR_ACCOUNT_QUEUE = "bank.bill.account.created.queue";
    public static final String BILL_CREATE_FOR_ACCOUNT_ROUTING_KEY = "bill.account.created";

    public static final String BILL_DELETE_BY_ACCOUNT_QUEUE = "bank.bill.account.deleted.queue";
    public static final String BILL_DELETE_BY_ACCOUNT_ROUTING_KEY = "bill.account.deleted";

    public static final String DEPOSIT_SAVE_QUEUE = "bank.deposit.save.queue";
    public static final String DEPOSIT_SAVE_ROUTING_KEY = "deposit.save";

    public static final String NOTIFICATION_DEPOSIT_QUEUE = "bank.notification.deposit.queue";
    public static final String NOTIFICATION_DEPOSIT_ROUTING_KEY = "notification.deposit";

    public static final String ACCOUNT_QUERY_QUEUE = "bank.account.query.queue";
    public static final String ACCOUNT_QUERY_ROUTING_KEY = "account.query";

    public static final String BILL_CREATE_FOR_ACCOUNT_DLQ = BILL_CREATE_FOR_ACCOUNT_QUEUE + ".dlq";
    public static final String BILL_DELETE_BY_ACCOUNT_DLQ = BILL_DELETE_BY_ACCOUNT_QUEUE + ".dlq";
    public static final String DEPOSIT_SAVE_DLQ = DEPOSIT_SAVE_QUEUE + ".dlq";
    public static final String NOTIFICATION_DEPOSIT_DLQ = NOTIFICATION_DEPOSIT_QUEUE + ".dlq";
    public static final String ACCOUNT_QUERY_DLQ = ACCOUNT_QUERY_QUEUE + ".dlq";
}
