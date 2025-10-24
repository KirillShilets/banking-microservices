package org.bank.account.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.bank.account.entity.Account;

@Getter
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
}
