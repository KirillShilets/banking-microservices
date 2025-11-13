package org.bank.dto.response;

public record NotificationResponseDTO(
        String recipient,
        String message
) {}
