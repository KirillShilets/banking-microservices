package org.bank.exception;

import org.springframework.http.HttpStatus;

public class InternalServerException extends ServiceException {
    public InternalServerException(String message) {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
