package org.bank.account.repository;

import org.bank.account.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Boolean existsByEmail(String email);

    @Modifying
    @Query("DELETE FROM Account a WHERE a.accountId = :accountId")
    void deleteAccountById(long accountId);
}
