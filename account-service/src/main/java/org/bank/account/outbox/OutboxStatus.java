package org.bank.account.outbox;

public enum OutboxStatus {
    PENDING,
    SENT,
    FAILED
}
