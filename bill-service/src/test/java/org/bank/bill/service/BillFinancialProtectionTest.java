package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.outbox.OutboxService;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillFinancialProtectionTest {

    private static final Long ACCOUNT_ID = 10L;
    private static final String OWNER_SUBJECT = "customer-subject";

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
    void setUp() {
        billService = new BillServiceImpl(
                billRepository,
                accountQueryGateway,
                outboxService,
                authenticatedUser,
                new BigDecimal("10.00"),
                true
        );
    }

    @Test
    void customerCanOpenBillOnlyWithZeroBalanceAndWithoutOverdraft() {
        when(accountQueryGateway.getAccount(ACCOUNT_ID))
                .thenReturn(new AccountResponseDTO(
                        OWNER_SUBJECT,
                        "Customer",
                        "customer@example.test",
                        "+375291234567",
                        OffsetDateTime.parse("2025-12-12T12:00:00Z")
                ));

        when(authenticatedUser.hasRole(
                org.mockito.ArgumentMatchers.anyString()
        )).thenAnswer(invocation -> {
            String requestedRole = invocation.getArgument(0);

            return BankRoles.CUSTOMER.equals(requestedRole);
        });

        when(authenticatedUser.subject())
                .thenReturn(OWNER_SUBJECT);

        when(billRepository.existsBillByAccountId(ACCOUNT_ID))
                .thenReturn(false);

        when(billRepository.save(any(Bill.class)))
                .thenAnswer(invocation -> {
                    Bill bill = invocation.getArgument(0);
                    bill.setBillId(100L);
                    return bill;
                });

        Long billId = billService.createBill(
                ACCOUNT_ID,
                BigDecimal.ZERO,
                false
        );

        ArgumentCaptor<Bill> captor =
                ArgumentCaptor.forClass(Bill.class);

        verify(billRepository).save(captor.capture());

        Bill saved = captor.getValue();

        assertThat(billId).isEqualTo(100L);
        assertThat(saved.getAccountId()).isEqualTo(ACCOUNT_ID);
        assertThat(saved.getAmount()).isEqualByComparingTo("0.00");
        assertThat(saved.getOverdraftEnabled()).isFalse();
        assertThat(saved.getIsDefault()).isTrue();

        verify(accountQueryGateway).getAccount(ACCOUNT_ID);
        verify(authenticatedUser).subject();
    }

    @Test
    void nonZeroOpeningBalanceIsRejectedBeforePersistence() {
        assertThrows(
                BadRequestException.class,
                () -> billService.createBill(
                        ACCOUNT_ID,
                        new BigDecimal("100.00"),
                        false
                )
        );

        verifyNoInteractions(
                billRepository,
                accountQueryGateway,
                outboxService
        );
    }

    @Test
    void negativeOpeningBalanceIsRejected() {
        assertThrows(
                BadRequestException.class,
                () -> billService.createBill(
                        ACCOUNT_ID,
                        new BigDecimal("-1.00"),
                        false
                )
        );

        verifyNoInteractions(billRepository, outboxService);
    }

    @Test
    void selfAssignedOverdraftIsRejected() {
        assertThrows(
                BadRequestException.class,
                () -> billService.createBill(
                        ACCOUNT_ID,
                        BigDecimal.ZERO,
                        true
                )
        );

        verifyNoInteractions(billRepository, outboxService);
    }

    @Test
    void publicBatchCannotContainNonZeroOpeningBalance() {
        List<CreateBillRequestDTO> requests = List.of(
                new CreateBillRequestDTO(BigDecimal.ZERO, false),
                new CreateBillRequestDTO(new BigDecimal("100.00"), false)
        );

        assertThrows(
                BadRequestException.class,
                () -> billService.createBillsForAccount(
                        ACCOUNT_ID,
                        requests
                )
        );

        verifyNoInteractions(billRepository, outboxService);
    }

    @Test
    void internalBatchCannotBypassFinancialValidation() {
        List<CreateBillRequestDTO> requests = List.of(
                new CreateBillRequestDTO(new BigDecimal("100.00"), false)
        );

        assertThrows(
                BadRequestException.class,
                () -> billService.createBillsForAccountInternal(
                        ACCOUNT_ID,
                        requests
                )
        );

        verifyNoInteractions(billRepository, outboxService);
    }

    @Test
    void internalBatchCannotEnableOverdraft() {
        List<CreateBillRequestDTO> requests = List.of(
                new CreateBillRequestDTO(BigDecimal.ZERO, true)
        );

        assertThrows(
                BadRequestException.class,
                () -> billService.createBillsForAccountInternal(
                        ACCOUNT_ID,
                        requests
                )
        );

        verifyNoInteractions(billRepository, outboxService);
    }

    @Test
    void emptyInternalBatchIsRejected() {
        assertThrows(
                BadRequestException.class,
                () -> billService.createBillsForAccountInternal(
                        ACCOUNT_ID,
                        List.of()
                )
        );

        verifyNoInteractions(billRepository, outboxService);
    }
}