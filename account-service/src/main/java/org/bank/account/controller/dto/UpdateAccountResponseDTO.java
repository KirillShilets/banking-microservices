package org.bank.account.controller.dto;

public record UpdateAccountResponseDTO(
        Long accountId,
        String name,
        String email,
        String phone
) {}
