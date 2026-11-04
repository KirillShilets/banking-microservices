package org.bank.bill.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Sandbox switches bound from {@code app.sandbox.*}.
 */
@ConfigurationProperties(prefix = "app.sandbox")
public record SandboxProperties(boolean depositsEnabled) {
}
