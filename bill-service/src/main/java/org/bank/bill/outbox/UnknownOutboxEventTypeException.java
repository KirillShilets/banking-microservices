package org.bank.bill.outbox;

/**
 * An outbox row carries an event type the relay does not know — usually a
 * message written by a newer version that this instance cannot handle yet.
 */
public class UnknownOutboxEventTypeException extends RuntimeException {

    public UnknownOutboxEventTypeException(String eventType) {
        super("Unknown outbox event type: " + eventType);
    }
}
