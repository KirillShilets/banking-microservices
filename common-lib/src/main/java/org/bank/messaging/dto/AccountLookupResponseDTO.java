package org.bank.messaging.dto;

import org.bank.dto.response.AccountResponseDTO;
import org.springframework.http.HttpStatus;

public record AccountLookupResponseDTO(AccountResponseDTO account, Integer statusCode, String errorMessage) {

    public static AccountLookupResponseDTO success(AccountResponseDTO account) {
        return new AccountLookupResponseDTO(account, HttpStatus.OK.value(), null);
    }

    public static AccountLookupResponseDTO failure(HttpStatus status, String errorMessage) {
        return new AccountLookupResponseDTO(null, status.value(), errorMessage);
    }

    public boolean isSuccess() {
        return account != null;
    }
}
