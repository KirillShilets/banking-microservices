package org.bank.account.controller.dto;

import lombok.AllArgsConstructor;
import org.bank.account.entity.Account;

@AllArgsConstructor
public class UpdateAccountResponseDTO {
    private Long accountId;
    private String name;
    private String email;
    private String phone;

    public UpdateAccountResponseDTO(Account account) {
        accountId = account.getAccountId();
        name = account.getName();
        email = account.getEmail();
        phone = account.getPhone();
    }

    public Long getAccountId() {
        return accountId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }
}
