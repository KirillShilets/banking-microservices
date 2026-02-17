package org.bank.account.repository;

import org.bank.account.entity.Account;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnablePostgresTestConfiguration
class AccountRepositoryUnitTest {

    private static final String ACCOUNT_NAME = "name";
    private static final String EMAIL = "test@test.com";
    private static final String PHONE = "+375444243564";
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("Should save and return account with correct mapping")
    void shouldSaveAndFindAccount() {
        Account account = new Account(ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME);
        Account savedAccount = accountRepository.save(account);

        entityManager.flush();
        entityManager.clear();

        Optional<Account> foundAccount = accountRepository.findById(savedAccount.getAccountId());

        assertThat(foundAccount).isPresent();
        assertThat(foundAccount.get().getName()).isEqualTo(ACCOUNT_NAME);
        assertThat(foundAccount.get().getEmail()).isEqualTo(EMAIL);
        assertThat(foundAccount.get().getAccountId()).isNotNull();
    }

    @Test
    @DisplayName("Should throw exception when saving account with duplicate email")
    void shouldThrowExceptionForDuplicateEmail() {
        Account account1 = new Account(ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME);
        Account account2 = new Account("name2", EMAIL, "+7389604783", DEFAULT_TIME);
        accountRepository.save(account1);

        assertThatThrownBy(() -> accountRepository.save(account2)).isInstanceOf(DataIntegrityViolationException.class);
    }
}