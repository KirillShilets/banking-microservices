package org.bank.messaging;

public final class RabbitTopology {

    private RabbitTopology() {
    }

    public static final String INTERNAL_EXCHANGE = "bank.internal.exchange";

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
}
