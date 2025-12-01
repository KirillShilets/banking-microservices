package org.bank.deposit.service;

import org.bank.deposit.entity.Deposit;
import org.bank.deposit.repository.DepositRepository;
import org.bank.dto.response.DepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepositServiceUnitTest {

    private static final Long DEPOSIT_ID = 1L;
    private static final Long NON_EXISTENT_ID = 99999L;
    private static final Long BILL_ID = 100L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final String EMAIL = "tedsfds@yandex.com";
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Mock
    private DepositRepository depositRepository;

    private DepositServiceImpl depositService;

    @BeforeEach
    void init() {
        depositService = new DepositServiceImpl(depositRepository);
    }

    @Test
    @DisplayName("Should save deposit and return response DTO")
    void saveDeposit_success() {
        Deposit savedDeposit = new Deposit(AMOUNT, BILL_ID, EMAIL, DEFAULT_TIME);

        when(depositRepository.save(any(Deposit.class))).thenReturn(savedDeposit);

        DepositResponseDTO result = depositService.saveDeposit(BILL_ID, AMOUNT, EMAIL);
        assertNotNull(result);
        assertEquals(BILL_ID, result.billId());
        assertEquals(AMOUNT, result.amount());
        assertEquals(EMAIL, result.email());
        assertNotNull(result.creationDate());

        verify(depositRepository, times(1)).save(any(Deposit.class));
    }

    @Test
    @DisplayName("Should return deposit details when deposit is found")
    void getDeposit_success() {
        Deposit deposit = new Deposit(AMOUNT, BILL_ID, EMAIL, DEFAULT_TIME);
        deposit.setDepositId(DEPOSIT_ID);

        when(depositRepository.findById(DEPOSIT_ID)).thenReturn(Optional.of(deposit));

        DepositResponseDTO result = depositService.getDeposit(DEPOSIT_ID);

        assertNotNull(result);
        assertEquals(BILL_ID, result.billId());
        assertEquals(AMOUNT, result.amount());
        assertEquals(EMAIL, result.email());
        assertEquals(deposit.getCreationDate(), result.creationDate());

        verify(depositRepository).findById(DEPOSIT_ID);
    }

    @Test
    @DisplayName("Should throw NotFoundException when deposit does not exist")
    void getDeposit_notFound() {
        when(depositRepository.findById(NON_EXISTENT_ID)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> depositService.getDeposit(NON_EXISTENT_ID));

        verify(depositRepository).findById(NON_EXISTENT_ID);
    }
}