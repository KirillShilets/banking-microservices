package org.bank.deposit.repository;

import org.bank.deposit.entity.Deposit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DepositRepository extends JpaRepository<Deposit, Long> {
    Optional<Deposit> findByMessageId(UUID messageId);
}
