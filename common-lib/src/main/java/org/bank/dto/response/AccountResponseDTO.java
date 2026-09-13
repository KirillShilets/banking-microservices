package org.bank.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.OffsetDateTime;

public record AccountResponseDTO(
        String ownerSubject,
        String name,
        String email,
        String phone,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
        OffsetDateTime creationDate
) {
    public AccountResponseDTO(String name, String email, String phone, OffsetDateTime creationDate) {
        this(null, name, email, phone, creationDate);
    }
}
