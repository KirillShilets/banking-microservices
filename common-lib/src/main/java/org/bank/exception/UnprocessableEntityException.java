package org.bank.exception;

import org.springframework.http.HttpStatus;

/**
 * A request that is syntactically valid but cannot be processed because the
 * referenced data is in a state the operation cannot accept.
 */
public class UnprocessableEntityException extends ServiceException {
    public UnprocessableEntityException(String message) {
        super(message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
