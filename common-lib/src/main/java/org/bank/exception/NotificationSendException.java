package org.bank.exception;

import org.springframework.http.HttpStatus;

public class NotificationSendException extends ServiceException {
    public NotificationSendException(String message) {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
