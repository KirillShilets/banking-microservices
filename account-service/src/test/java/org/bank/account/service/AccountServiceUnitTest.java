package org.bank.account.service;

import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.entity.Account;
import org.bank.account.handler.event.AccountCreatedEvent;
import org.bank.account.handler.event.AccountDeletedEvent;
import org.bank.account.repository.AccountRepository;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.exception.AlreadyExistsException;
import org.bank.exception.NotFoundException;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceUnitTest {

    private static final Long ACCOUNT_ID = 1L;
    private static final Long NON_EXISTENT_ID = 99999L;
    private static final String NAME = "name";
    private static final String NEW_NAME = "new-name";
    private static final String EMAIL = "test@yandex.com";
    private static final String PHONE = "+375444243564";
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");
    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";

    private static final List<CreateBillRequestDTO> EMPTY_BILLS = Collections.emptyList();

    @Mock
    private AccountRepository accountRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private AuthenticatedUser authenticatedUser;
    private AccountServiceImpl accountService;

    @BeforeEach
    void init() {
        accountService = new AccountServiceImpl(
                accountRepository,
                eventPublisher,
                authenticatedUser
        );
    }

    @Test
    @DisplayName("Should return account details when account is found")
    void getAccount_success() {
        Account account = new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME);
        account.setAccountId(ACCOUNT_ID);

        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));
        when(authenticatedUser.hasRole(BankRoles.ADMIN)).thenReturn(true);

        AccountResponseDTO dto = accountService.getAccount(ACCOUNT_ID);
        assertEquals(NAME, dto.name());
        assertEquals(EMAIL, dto.email());
        assertEquals(PHONE, dto.phone());
        verify(accountRepository).findById(ACCOUNT_ID);
    }

    @Test
    @DisplayName("Should throw NotFoundException when account does not exist")
    void getAccount_notFound() {
        when(accountRepository.findById(NON_EXISTENT_ID)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> accountService.getAccount(NON_EXISTENT_ID));
    }

    @Test
    @DisplayName("Should create a new account successfully and publish event")
    void createAccount_success() {
        Account savedAccount = new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME);
        savedAccount.setAccountId(ACCOUNT_ID);

        when(accountRepository.save(any(Account.class))).thenReturn(savedAccount);

        Long createdId = accountService.createAccount(NAME, EMAIL, PHONE, EMPTY_BILLS);

        assertEquals(ACCOUNT_ID, createdId);
        verify(accountRepository).save(any(Account.class));
        verify(eventPublisher, times(1)).publishEvent(any(AccountCreatedEvent.class));
    }

    @Test
    @DisplayName("Should throw AlreadyExistsException when email is already in use")
    void createAccount_alreadyExists() {
        when(accountRepository.save(any(Account.class)))
                .thenThrow(new DataIntegrityViolationException("Account already exists"));

        assertThrows(
                AlreadyExistsException.class,
                () -> accountService.createAccount(NAME, EMAIL, PHONE, EMPTY_BILLS)
        );

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Should update existing account details")
    void updateAccount_success() {
        Account existingAccount = new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME);
        existingAccount.setAccountId(ACCOUNT_ID);
        Account updatedAccount = new Account(OWNER_SUB, NEW_NAME, EMAIL, PHONE, existingAccount.getCreationDate());
        updatedAccount.setAccountId(ACCOUNT_ID);

        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(existingAccount));
        when(accountRepository.save(any(Account.class))).thenReturn(updatedAccount);
        when(authenticatedUser.hasRole(BankRoles.ADMIN)).thenReturn(true);

        UpdateAccountResponseDTO dto = accountService.updateAccount(ACCOUNT_ID, NEW_NAME, EMAIL, PHONE);

        assertEquals(ACCOUNT_ID, dto.accountId());
        assertEquals(NEW_NAME, dto.name());

        verify(accountRepository).findById(ACCOUNT_ID);
        verify(accountRepository).save(any(Account.class));
    }

    @Test
    @DisplayName("Should throw NotFoundException when trying to update non-existent account")
    void updateAccount_notFound() {
        when(accountRepository.findById(NON_EXISTENT_ID)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> accountService.updateAccount(NON_EXISTENT_ID, NEW_NAME, EMAIL, PHONE)
        );

        verify(accountRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should delete account and publish event when account exists")
    void deleteAccount_success() {
        Account account = new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME);
        account.setAccountId(ACCOUNT_ID);
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        accountService.deleteAccount(ACCOUNT_ID);

        verify(accountRepository).delete(account);
        verify(eventPublisher, times(1)).publishEvent(any(AccountDeletedEvent.class));
    }

    @Test
    @DisplayName("Should throw NotFoundException when attempting to delete non-existent account")
    void deleteAccount_notFound() {
        when(accountRepository.findById(NON_EXISTENT_ID)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> accountService.deleteAccount(NON_EXISTENT_ID));

        verify(accountRepository, never()).delete(any());
        verifyNoInteractions(eventPublisher);
    }
}