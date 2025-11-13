package org.bank.account.controller.dto;

import jakarta.validation.constraints.*;

public record UpdateAccountRequestDTO(
        @NotBlank(message = "Name is required")
        @Size(min = 3, max = 63, message = "Name must be between 2 and 50 characters long")
        String name,
        @Email(message = "Email must be valid")
        @NotBlank(message = "Email is required")
        @Size(max = 127, message = "Email must be less 127 characters long")
        String email,
        @Pattern(regexp = "\\+?[0-9]{10,15}", message = "Phone number must be valid")
        String phone
) {}
