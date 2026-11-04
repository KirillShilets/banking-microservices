package org.bank.bill.outbox;

/**
 * Names of the outbox events this service writes. Kept in one place so a typo
 * cannot silently produce a message that the relay classifies as unknown.
 */
public final class OutboxEventTypes {

    public static final String AGGREGATE_BILL = "BILL";

    public static final String DEPOSIT_CREATED = "DEPOSIT_CREATED";
    public static final String NOTIFICATION_CREATED = "NOTIFICATION_CREATED";

    private OutboxEventTypes() {
    }
}
