package org.bank.validation;

import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.exception.BadRequestException;

import java.math.BigDecimal;
import java.util.List;

public final class BillOpeningValidator {

    public static final int MAX_BILLS_PER_REQUEST = 20;

    private BillOpeningValidator() {}

    public static void validateAccountId(Long accountId) {
        if (accountId == null || accountId <= 0) {
            throw new BadRequestException(
                    "Account id must be a positive number"
            );
        }
    }

    public static void validateOpening(BigDecimal amount, Boolean overdraftEnabled) {
        if (amount == null) {
            throw new BadRequestException(
                    "Initial balance must be specified"
            );
        }

        if (amount.compareTo(BigDecimal.ZERO) != 0) {
            throw new BadRequestException(
                    "A new bill must have a zero balance"
            );
        }

        if (overdraftEnabled == null) {
            throw new BadRequestException(
                    "Overdraft setting must be specified"
            );
        }

        if (overdraftEnabled) {
            throw new BadRequestException(
                    "Overdraft cannot be enabled when opening a bill"
            );
        }
    }

    public static void validateOpenings(List<CreateBillRequestDTO> bills) {
        if (bills == null || bills.isEmpty()) {
            throw new BadRequestException(
                    "At least one bill must be provided"
            );
        }

        if (bills.size() > MAX_BILLS_PER_REQUEST) {
            throw new BadRequestException(
                    "No more than " + MAX_BILLS_PER_REQUEST
                            + " bills can be opened in one request"
            );
        }

        for (CreateBillRequestDTO bill : bills) {
            if (bill == null) {
                throw new BadRequestException(
                        "Bills list must not contain null elements"
                );
            }

            validateOpening(
                    bill.amount(),
                    bill.overdraftEnabled()
            );
        }
    }
}