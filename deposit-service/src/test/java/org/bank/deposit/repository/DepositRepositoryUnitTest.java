package org.bank.deposit.repository;

import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.bank.deposit.entity.Deposit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnablePostgresTestConfiguration
class DepositRepositoryUnitTest {

    private static final Long BILL_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final String EMAIL = "popdmdsg@mail.ru";
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Autowired
    private DepositRepository depositRepository;

    @Autowired
    private TestEntityManager entityManager;

    @BeforeEach
    void setUp() {
        depositRepository.deleteAll();
    }

    @Test
    @DisplayName("Should save bill and find it by ID")
    void shouldSaveAndFindBill() {
        Deposit deposit = new Deposit(AMOUNT, BILL_ID, EMAIL, DEFAULT_TIME);
        Deposit savedBill = depositRepository.save(deposit);
        assertThat(savedBill.getBillId()).isNotNull();

        entityManager.flush();
        entityManager.clear();

        Optional<Deposit> foundBillOptional = depositRepository.findById(savedBill.getBillId());
        assertThat(foundBillOptional).isPresent();
        Deposit foundBill = foundBillOptional.get();

        assertThat(foundBill.getBillId()).isEqualTo(savedBill.getBillId());
        assertThat(foundBill.getEmail()).isEqualTo(EMAIL);
        assertThat(foundBill.getAmount()).isEqualByComparingTo(AMOUNT);
    }
}
