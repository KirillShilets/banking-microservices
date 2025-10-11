package org.bank.bill.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long billId;

    private Long accountId;
    private BigDecimal amount;
    private Boolean isDefault;
    private OffsetDateTime creationDate;
    private Boolean overdraftEnabled;

    public Bill(Long accountId, BigDecimal amount, Boolean isDefault,
                OffsetDateTime creationDate, Boolean overdraftEnabled) {
        this.accountId = accountId;
        this.amount = amount;
        this.isDefault = isDefault;
        this.creationDate = creationDate;
        this.overdraftEnabled = overdraftEnabled;
    }

    public Bill(Long accountId, BigDecimal amount, Boolean isDefault, Boolean overdraftEnabled) {
        this.accountId = accountId;
        this.amount = amount;
        this.isDefault = isDefault;
        this.overdraftEnabled = overdraftEnabled;
    }
}
