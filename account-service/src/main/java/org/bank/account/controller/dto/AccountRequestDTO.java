package org.bank.account.controller.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.bank.dto.request.CreateBillRequestDTO;

import java.util.List;

public record AccountRequestDTO(
        @NotBlank(message = "Name is required")
        @Size(min = 3, max = 63, message = "Name must be between 3 and 63 characters long")
        String name,
        @Email(message = "Email must be valid")
        @NotBlank(message = "Email is required")
        @Size(max = 127, message = "Email must be less 127 characters long")
        String email,
        @Pattern(regexp = "\\+?[0-9]{10,15}", message = "Phone number must be valid")
        String phone,
        @Valid
        @NotEmpty(message = "Bills list is required")
        @Size(min = 1, message = "At least one bill must be provided")
        List<CreateBillRequestDTO> bills
) {
        public AccountRequestDTO {
                bills = List.copyOf(bills);
        }
}
