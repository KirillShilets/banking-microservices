package org.bank.bill.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "bills")
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bill_id")
    private Long billId;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @NotNull
    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @NotNull
    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    /**
     * Projection of the account owner. Null only for rows created before the
     * projection existed; authorization falls back to account-service for those.
     */
    @Column(name = "owner_subject", length = 36)
    private String ownerSubject;

    @NotNull
    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @CreationTimestamp
    @Column(name = "creation_date", nullable = false, updatable = false)
    private OffsetDateTime creationDate;

    @NotNull
    @Column(name = "overdraft_enabled", nullable = false)
    private Boolean overdraftEnabled;

    public Bill(
            Long accountId,
            String ownerSubject,
            BigDecimal amount,
            Boolean isOverdraftEnabled
    ) {
        this.accountId = accountId;
        this.ownerSubject = ownerSubject;
        this.amount = amount;
        this.overdraftEnabled = isOverdraftEnabled;
    }

    /**
     * Creates a bill without an owner projection. Used for rows that predate the
     * projection; new bills must set the owner so authorization stays local.
     */
    public Bill(Long accountId, BigDecimal amount, Boolean isOverdraftEnabled) {
        this(accountId, null, amount, isOverdraftEnabled);
    }

    @PrePersist
    protected void setCreationDate() {
        this.creationDate = OffsetDateTime.now();
    }
}
