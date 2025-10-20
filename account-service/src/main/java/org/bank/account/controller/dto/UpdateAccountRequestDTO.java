package org.bank.account.controller.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateAccountRequestDTO {
    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 63, message = "Name must be between 2 and 50 characters long")
    private String name;

    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    @Size(max = 127, message = "Email must be less 127 characters long")
    private String email;

    @Pattern(regexp = "\\+?[0-9]{10,15}", message = "Phone number must be valid")
    private String phone;
}
