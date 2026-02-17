package org.bank.bill.repository;

import org.bank.bill.entity.Bill;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnablePostgresTestConfiguration
class BillRepositoryUnitTest {

    private static final Long ACCOUNT_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("Should save bill and find it by ID")
    void shouldSaveAndFindBill() {
        Bill bill = new Bill(ACCOUNT_ID, AMOUNT, true);
        Bill savedBill = billRepository.save(bill);
        assertThat(savedBill.getBillId()).isNotNull();

        entityManager.flush();
        entityManager.clear();

        Optional<Bill> foundBillOptional = billRepository.findById(savedBill.getBillId());
        assertThat(foundBillOptional).isPresent();
        Bill foundBill = foundBillOptional.get();

        assertThat(foundBill.getBillId()).isEqualTo(savedBill.getBillId());
        assertThat(foundBill.getAccountId()).isEqualTo(ACCOUNT_ID);
        assertThat(foundBill.getAmount()).isEqualByComparingTo(AMOUNT);
        assertThat(foundBill.getIsDefault()).isFalse();
    }
}