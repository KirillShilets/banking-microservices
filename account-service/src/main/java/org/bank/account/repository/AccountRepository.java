package org.bank.account.repository;

import org.bank.account.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    @Query("SELECT a FROM Account a LEFT JOIN FETCH a.bills WHERE a.accountId = :id")
    Optional<Account> findAccountWithBills(@Param("id") Long id);
}
