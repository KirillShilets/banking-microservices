package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.handler.event.DepositEvent;
import org.bank.bill.handler.event.NotificationEvent;
import org.bank.bill.repository.BillRepository;
import org.bank.client.AccountServiceClient;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.NotFoundException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillServiceUnitTest {

    private static final Long BILL_ID = 10L;
    private static final Long ACCOUNT_ID = 1L;
    private static final Long NON_EXISTENT_ID = 99L;
    private static final BigDecimal AMOUNT_100 = new BigDecimal("100.00");
    private static final BigDecimal DEPOSIT_20 = new BigDecimal("20.00");
    private static final BigDecimal MIN_DEPOSIT_LIMIT = new BigDecimal("10.00");
    private static final BigDecimal WRONG_DEPOSIT = new BigDecimal("1.00");
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");
    private static final String ACCOUNT_NAME = "name";
    private static final String EMAIL = "test@test.com";
    private static final String PHONE = "+375444243564";

    @Mock
    private BillRepository billRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private BillServiceImpl billService;

    @BeforeEach
    void init() {
        billService = new BillServiceImpl(
                billRepository,
                accountServiceClient,
                eventPublisher,
                MIN_DEPOSIT_LIMIT
        );
    }

    @Test
    @DisplayName("Should return bill details when bill is found")
    void getBill_success() {
        Bill bill = new Bill(ACCOUNT_ID, AMOUNT_100, false);
        bill.setBillId(BILL_ID);

        when(billRepository.findById(BILL_ID)).thenReturn(Optional.of(bill));

        BillResponseDTO dto = billService.getBill(BILL_ID);

        assertEquals(BILL_ID, dto.billId());
        assertEquals(AMOUNT_100, dto.amount());
        verify(billRepository).findById(BILL_ID);
    }

    @Test
    @DisplayName("Should throw NotFoundException when bill does not exist")
    void getBill_notFound() {
        when(billRepository.findById(NON_EXISTENT_ID)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> billService.getBill(NON_EXISTENT_ID));
    }

    @Test
    @DisplayName("Should create a new bill successfully")
    void createBill_success() {
        when(accountServiceClient.getAccount(ACCOUNT_ID))
                .thenReturn(new AccountResponseDTO(ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME));

        Bill saved = new Bill(ACCOUNT_ID, AMOUNT_100, false);
        saved.setBillId(100L);

        when(billRepository.existsBillByAccountId(ACCOUNT_ID)).thenReturn(false);
        when(billRepository.save(any(Bill.class))).thenReturn(saved);

        Long billId = billService.createBill(ACCOUNT_ID, AMOUNT_100, false);

        assertEquals(100L, billId);
        verify(billRepository).save(any(Bill.class));
    }

    @Test
    @DisplayName("Should update existing bill details")
    void updateBill_success() {
        Bill bill = new Bill(ACCOUNT_ID, AMOUNT_100, false);
        bill.setBillId(BILL_ID);

        when(accountServiceClient.getAccount(ACCOUNT_ID))
                .thenReturn(new AccountResponseDTO(ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME));
        when(billRepository.findById(BILL_ID)).thenReturn(Optional.of(bill));
        when(billRepository.save(any(Bill.class))).thenReturn(bill);

        BillResponseDTO dto = billService.updateBill(BILL_ID, ACCOUNT_ID, AMOUNT_100, true);

        assertEquals(AMOUNT_100, dto.amount());
        assertTrue(dto.overdraftEnabled());
    }

    @Test
    @DisplayName("Should deposit funds, update balance and publish events")
    void depositBill_success() {
        Bill bill = new Bill(ACCOUNT_ID, AMOUNT_100, false);
        bill.setBillId(BILL_ID);
        bill.setCreationDate(OffsetDateTime.now());

        when(billRepository.findById(BILL_ID)).thenReturn(Optional.of(bill));
        when(accountServiceClient.getAccount(ACCOUNT_ID))
                .thenReturn(new AccountResponseDTO(ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME));
        when(billRepository.save(any(Bill.class))).thenReturn(bill);

        BillDepositResponseDTO response = billService.depositBill(BILL_ID, DEPOSIT_20, EMAIL);
        BigDecimal amountAfterDeposit = AMOUNT_100.add(DEPOSIT_20);
        assertEquals(amountAfterDeposit, response.amount());

        verify(eventPublisher, times(1)).publishEvent(any(NotificationEvent.class));
        verify(eventPublisher, times(1)).publishEvent(any(DepositEvent.class));
    }

    @Test
    @DisplayName("Should throw BadRequestException when deposit amount is too small")
    void depositBill_tooSmallAmount() {
        assertThrows(
                BadRequestException.class,
                () -> billService.depositBill(BILL_ID, WRONG_DEPOSIT, EMAIL)
        );

        verify(billRepository, never()).save(any());
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("Should throw BadRequestException when email does not match account owner")
    void depositBill_wrongEmail() {
        Bill bill = new Bill(ACCOUNT_ID, AMOUNT_100, false);
        bill.setBillId(BILL_ID);

        when(billRepository.findById(BILL_ID)).thenReturn(Optional.of(bill));
        when(accountServiceClient.getAccount(ACCOUNT_ID))
                .thenReturn(new AccountResponseDTO(ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME));

        assertThrows(
                BadRequestException.class,
                () -> billService.depositBill(BILL_ID, DEPOSIT_20, "testdfguihdfjg@internet.com")
        );
    }

    @Test
    @DisplayName("Should delete bill when it exists")
    void deleteBill_success() {
        when(billRepository.existsById(5L)).thenReturn(true);
        billService.deleteBill(5L);
        verify(billRepository).deleteById(5L);
    }

    @Test
    @DisplayName("Should throw NotFoundException when attempting to delete non-existent bill")
    void deleteBill_notFound() {
        when(billRepository.existsById(5L)).thenReturn(false);
        assertThrows(NotFoundException.class, () -> billService.deleteBill(5L));
    }
}