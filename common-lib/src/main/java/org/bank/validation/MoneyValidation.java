package org.bank.validation;

import org.bank.exception.BadRequestException;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MoneyValidation {

    public static final BigDecimal MAX_VALUE =
            new BigDecimal("99999999999999999.99");

    private MoneyValidation() {
    }

    public static BigDecimal positiveAmount(BigDecimal value) {
        if (value == null) {
            throw new BadRequestException("Amount is required");
        }

        if (value.signum() <= 0) {
            throw new BadRequestException("Amount must be greater than zero");
        }

        if (value.compareTo(MAX_VALUE) > 0) {
            throw new BadRequestException("Amount exceeds the supported limit");
        }

        try {
            return value.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw new BadRequestException(
                    "Amount must not contain fractions smaller than 0.01"
            );
        }
    }

    public static BigDecimal checkedBalance(BigDecimal balance) {
        if (balance == null) {
            throw new IllegalStateException("Stored balance is missing");
        }

        if (balance.signum() < 0 || balance.compareTo(MAX_VALUE) > 0) {
            throw new BadRequestException(
                    "Resulting balance is outside the supported range"
            );
        }

        try {
            return balance.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw new IllegalStateException(
                    "Stored balance has unsupported precision",
                    exception
            );
        }
    }
}