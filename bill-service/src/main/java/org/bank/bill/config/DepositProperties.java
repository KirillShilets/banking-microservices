package org.bank.bill.config;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.math.BigDecimal;

/**
 * Sandbox deposit policy bound from {@code app.deposit.*}.
 *
 * <p>Deliberately has no fallback value: the deployed minimum lives in the
 * shared configuration ({@code 2.60} for kind). The previous hard-coded
 * {@code @Value} default of {@code 10.00} silently disagreed with it whenever
 * the configuration was absent, so a missing value now fails at startup instead.
 */
@Validated
@ConfigurationProperties(prefix = "app.deposit")
public record DepositProperties(
        @NotNull(message = "app.deposit.min-amount must be configured")
        @DecimalMin(value = "0.01", message = "app.deposit.min-amount must be positive")
        @Digits(
                integer = 17,
                fraction = 2,
                message = "app.deposit.min-amount must fit NUMERIC(19,2)"
        )
        BigDecimal minAmount
) {
}
