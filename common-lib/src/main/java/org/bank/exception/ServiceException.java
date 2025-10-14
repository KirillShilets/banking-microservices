package org.bank.exception;

import org.springframework.http.HttpStatus;

public abstract class ServiceException extends RuntimeException {
    private final HttpStatus status;

    protected ServiceException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
