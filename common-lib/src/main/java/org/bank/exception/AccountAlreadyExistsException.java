package org.bank.exception;

import org.springframework.http.HttpStatus;

public class AccountAlreadyExistsException extends ServiceException {
    public AccountAlreadyExistsException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
