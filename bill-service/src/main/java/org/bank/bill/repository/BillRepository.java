package org.bank.bill.repository;

import jakarta.persistence.LockModeType;
import org.bank.bill.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> getBillsByAccountId(Long accountId);
    boolean existsBillByAccountId(Long accountId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bill b WHERE b.billId = :billId")
    Optional<Bill> findByIdForUpdate(@Param("billId") Long billId);
}
