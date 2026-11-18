package org.bank.bill.outbox;

/**
 * The stored payload cannot be read back into a command. Retrying will never
 * help, so the relay parks the message instead of burning attempts on it.
 */
public class OutboxPayloadException extends RuntimeException {

    public OutboxPayloadException(String message, Throwable cause) {
        super(message, cause);
    }
}
