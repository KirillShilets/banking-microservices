package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.outbox.OutboxService;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.ForbiddenException;
import org.bank.exception.NotFoundException;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
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
    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final String OTHER_SUB = "22222222-2222-2222-2222-222222222222";

    @Mock
    private BillRepository billRepository;

    @Mock
    private AccountQueryGateway accountQueryGateway;

    @Mock
    private OutboxService outboxService;

    @Mock
    private AuthenticatedUser authenticatedUser;

    private BillServiceImpl billService;

    @BeforeEach
    void init() {
        billService = new BillServiceImpl(
                billRepository,
                accountQueryGateway,
                outboxService,
                authenticatedUser,
                MIN_DEPOSIT_LIMIT,
                true
        );
    }

    private AccountResponseDTO account() {
        return new AccountResponseDTO(OWNER_SUB, ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME);
    }

    private void asAdmin() {
        when(authenticatedUser.hasRole(BankRoles.ADMIN)).thenReturn(true);
    }

    private void asCustomer(String subject) {
        when(authenticatedUser.hasRole(BankRoles.ADMIN)).thenReturn(false);
        when(authenticatedUser.hasRole(BankRoles.EMPLOYEE)).thenReturn(false);
        when(authenticatedUser.hasRole(BankRoles.CUSTOMER)).thenReturn(true);
        when(authenticatedUser.subject()).thenReturn(subject);
    }

    private Bill bill() {
        Bill bill = new Bill(ACCOUNT_ID, AMOUNT_100, false);
        bill.setBillId(BILL_ID);
        return bill;
    }

    @Test
    @DisplayName("Should return bill details when bill is found")
    void getBill_success() {
        asAdmin();
        when(billRepository.findById(BILL_ID)).thenReturn(Optional.of(bill()));
        when(accountQueryGateway.getAccount(ACCOUNT_ID)).thenReturn(account());

        BillResponseDTO dto = billService.getBill(BILL_ID);

        assertEquals(BILL_ID, dto.billId());
        assertEquals(AMOUNT_100, dto.amount());
        verify(billRepository).findById(BILL_ID);
    }

    @Test
    @DisplayName("Should return bill to customer who owns the account")
    void getBill_customerOwner_success() {
        asCustomer(OWNER_SUB);
        when(billRepository.findById(BILL_ID)).thenReturn(Optional.of(bill()));
        when(accountQueryGateway.getAccount(ACCOUNT_ID)).thenReturn(account());

        BillResponseDTO dto = billService.getBill(BILL_ID);

        assertEquals(BILL_ID, dto.billId());
    }

    @Test
    @DisplayName("Should throw ForbiddenException when customer accesses someone else's bill")
    void getBill_customerForeign_forbidden() {
        asCustomer(OTHER_SUB);
        when(billRepository.findById(BILL_ID)).thenReturn(Optional.of(bill()));
        when(accountQueryGateway.getAccount(ACCOUNT_ID)).thenReturn(account());

        assertThrows(ForbiddenException.class, () -> billService.getBill(BILL_ID));
    }

    @Test
    @DisplayName("Should throw NotFoundException when bill does not exist")
    void getBill_notFound() {
        when(billRepository.findById(NON_EXISTENT_ID)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> billService.getBill(NON_EXISTENT_ID));
        verifyNoInteractions(accountQueryGateway);
    }

    @Test
    @DisplayName("Should open a bill with zero balance")
    void createBill_success() {
        asAdmin();

        when(accountQueryGateway.getAccount(ACCOUNT_ID))
                .thenReturn(account());

        Bill saved = new Bill(
                ACCOUNT_ID,
                BigDecimal.ZERO,
                false
        );
        saved.setBillId(100L);

        when(billRepository.existsBillByAccountId(ACCOUNT_ID))
                .thenReturn(false);
        when(billRepository.save(any(Bill.class)))
                .thenReturn(saved);

        Long billId = billService.createBill(
                ACCOUNT_ID,
                BigDecimal.ZERO,
                false
        );

        assertEquals(100L, billId);

        verify(billRepository).save(any(Bill.class));
    }

    @Test
    @DisplayName("Should deposit funds, update balance and publish events")
    void depositBill_success() {
        asAdmin();

        Bill bill = bill();
        bill.setCreationDate(OffsetDateTime.now());

        when(billRepository.findByIdForUpdate(BILL_ID))
                .thenReturn(Optional.of(bill));

        when(accountQueryGateway.getAccount(ACCOUNT_ID))
                .thenReturn(account());

        BillDepositResponseDTO response =
                billService.depositBill(BILL_ID, DEPOSIT_20);

        assertEquals(
                AMOUNT_100.add(DEPOSIT_20),
                response.amount()
        );

        verify(outboxService, times(2)).saveEvent(
                eq("BILL"),
                eq(BILL_ID.toString()),
                anyString(),
                any()
        );
    }

    @Test
    @DisplayName("Should throw BadRequestException when deposit amount is too small")
    void depositBill_tooSmallAmount() {
        asAdmin();

        assertThrows(
                BadRequestException.class,
                () -> billService.depositBill(
                        BILL_ID,
                        WRONG_DEPOSIT
                )
        );

        verify(billRepository, never()).findByIdForUpdate(anyLong());
        verify(billRepository, never()).save(any());
        verifyNoInteractions(outboxService, accountQueryGateway);
    }
}