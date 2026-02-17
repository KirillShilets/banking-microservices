package org.bank.bill.repository;

import org.bank.bill.entity.Bill;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;
import java.util.List;
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

    @BeforeEach
    void setUp() {
        billRepository.deleteAll();
    }

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

    @Test
    @DisplayName("Should return bills only for specific accountId")
    void getBillsByAccountId_success() {
        Bill bill1 = new Bill(ACCOUNT_ID, AMOUNT, true);
        Bill bill2 = new Bill(ACCOUNT_ID, AMOUNT, false);
        Bill billOther = new Bill(3L, AMOUNT, true);

        billRepository.saveAll(List.of(bill1, bill2, billOther));

        List<Bill> result = billRepository.getBillsByAccountId(ACCOUNT_ID);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Bill::getAccountId)
                .containsOnly(ACCOUNT_ID);
    }

    @Test
    @DisplayName("Should return true if bill exists for accountId")
    void existsBillByAccountId_shouldReturnTrue() {
        billRepository.save(new Bill(ACCOUNT_ID, AMOUNT, true));
        assertThat(billRepository.existsBillByAccountId(ACCOUNT_ID)).isTrue();
    }

    @Test
    @DisplayName("Should return false if bill does not exist for accountId")
    void existsBillByAccountId_shouldReturnFalse() {
        assertThat(billRepository.existsBillByAccountId(ACCOUNT_ID)).isFalse();
    }

    @Test
    @DisplayName("Should delete all bills for specific accountId")
    void deleteBillsByAccountId_success() {
        Bill bill1 = new Bill(ACCOUNT_ID, AMOUNT, true);
        Bill bill2 = new Bill(ACCOUNT_ID, AMOUNT, false);
        Bill billOther = new Bill(2L, AMOUNT, true);
        billRepository.saveAll(List.of(bill1, bill2, billOther));

        entityManager.flush();
        entityManager.clear();

        billRepository.deleteBillsByAccountId(ACCOUNT_ID);

        List<Bill> remainingAccount1 = billRepository.getBillsByAccountId(ACCOUNT_ID);
        assertThat(remainingAccount1).isEmpty();

        List<Bill> remainingAccount2 = billRepository.getBillsByAccountId(2L);
        assertThat(remainingAccount2).hasSize(1);
    }
}