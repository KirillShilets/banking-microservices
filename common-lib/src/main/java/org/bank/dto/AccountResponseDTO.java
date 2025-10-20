package org.bank.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class AccountResponseDTO {
    private Long id;
    private String name;
    private String email;
    private List<Long> bills;
    private String phone;
    private OffsetDateTime createdDate;
}
