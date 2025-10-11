package org.bank.deposit.repository;

import org.bank.deposit.entity.Deposit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepositRepository extends JpaRepository<Deposit, Long> {
}
