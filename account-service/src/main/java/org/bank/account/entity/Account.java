package org.bank.account.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@ToString
@Table(name = "accounts", indexes = {@Index(columnList = "email", name = "idx_account_email")})
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long accountId;

    @Column(nullable = false, length = 63)
    private String name;

    @Column(nullable = false, unique = true, length = 127)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "creation_date", nullable = false)
    private OffsetDateTime creationDate;

    public Account(String name, String email, String phone, OffsetDateTime creationDate) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.creationDate = creationDate;
    }
}
