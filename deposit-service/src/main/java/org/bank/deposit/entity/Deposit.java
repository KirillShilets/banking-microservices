package org.bank.deposit.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@ToString
@Table(name = "deposits", indexes = {@Index(columnList = "email", name = "idx_deposit_email")})
public class Deposit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "deposit_id")
    private Long depositId;

    @NotNull
    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @NotNull
    @Column(name = "bill_id", nullable = false)
    private Long billId;

    @Column(name = "email", nullable = false, length = 127)
    private String email;

    @CreationTimestamp
    @Column(name = "creation_date", nullable = false, updatable = false)
    private OffsetDateTime creationDate;

    public Deposit(BigDecimal amount, Long billId, String email, OffsetDateTime creationDate) {
        this.amount = amount;
        this.billId = billId;
        this.creationDate = creationDate;
        this.email = email;
    }
}
