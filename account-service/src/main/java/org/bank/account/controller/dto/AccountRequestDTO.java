package org.bank.account.controller.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.bank.dto.CreateBillRequestDTO;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
public class AccountRequestDTO {

    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 63, message = "Name must be between 3 and 63 characters long")
    private String name;

    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    @Size(max = 127, message = "Email must be less 127 characters long")
    private String email;

    @Pattern(regexp = "\\+?[0-9]{10,15}", message = "Phone number must be valid")
    private String phone;

    @NotEmpty(message = "Bills list is required")
    @Size(min = 1, message = "At least one bill must be provided")
    private List<CreateBillRequestDTO> bills;

    @PastOrPresent(message = "Creation date cannot be in the future")
    private OffsetDateTime creationDate;
}
