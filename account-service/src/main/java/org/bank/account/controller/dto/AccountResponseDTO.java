package org.bank.account.controller.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.bank.account.entity.Account;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class AccountResponseDTO {
    private Long accountId;
    private String name;
    private String email;
    private String phone;
    private List<Long> bills;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
    private OffsetDateTime creationDate;

    public AccountResponseDTO(Account account) {
        accountId = account.getAccountId();
        name = account.getName();
        email = account.getEmail();
        phone = account.getPhone();
        bills = account.getBills();
        creationDate = account.getCreationDate();
    }
}
