package org.bank.exception;

import org.springframework.http.HttpStatus;

public class MethodNotAllowedException extends ServiceException {
    public MethodNotAllowedException(String message) {
        super(message, HttpStatus.METHOD_NOT_ALLOWED);
    }
}
