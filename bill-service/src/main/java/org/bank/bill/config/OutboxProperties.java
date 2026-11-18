package org.bank.bill.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/**
 * Outbox housekeeping bound from {@code app.outbox.*}.
 *
 * <p>Only delivered rows are purged; {@code FAILED} rows are kept because they
 * are the sole evidence of a message that will never be delivered.
 */
@ConfigurationProperties(prefix = "app.outbox")
public record OutboxProperties(
        @DefaultValue("P7D") Duration retention
) {
}
