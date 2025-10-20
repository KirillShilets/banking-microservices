package org.bank.account.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "accounts", indexes = {@Index(columnList = "email", name = "idx_account_email")})
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long accountId;

    @Column(nullable = false, length = 63)
    private String name;

    @Column(nullable = false, unique = true, length = 127)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false)
    private OffsetDateTime creationDate;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "account_bills", joinColumns = @JoinColumn(name = "account_id"))
    @Column(name = "bill_id")
    private List<Long> bills = new ArrayList<>();

    public Account(String name, String email, String phone,
                   OffsetDateTime creationDate, List<Long> bills) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.creationDate = creationDate;
        this.bills = bills == null ? new ArrayList<>() : bills;
    }
}
