package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.outbox.OutboxService;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.bill.idempotency.IdempotencyKeyRepository;
import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillDepositExecutorTest {

    private static final Long BILL_ID = 42L;
    private static final Long ACCOUNT_ID = 10L;
    private static final String OWNER_SUBJECT = "owner-subject";
    private static final String EMAIL = "customer@example.test";
    private static final String IDEMPOTENCY_KEY = "deposit-key-1";

    @Mock
    private BillRepository billRepository;

    @Mock
    private OutboxService outboxService;

    @Mock
    private IdempotencyKeyRepository idempotencyKeyRepository;

    private BillDepositExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new BillDepositExecutor(
                billRepository,
                outboxService,
                idempotencyKeyRepository,
                new ObjectMapper().findAndRegisterModules()
        );
    }

    @Test
    @DisplayName("Credit the balance and register both outbox events")
    void creditsBalanceAndWritesBothEvents() {
        Bill bill = new Bill(
                ACCOUNT_ID,
                OWNER_SUBJECT,
                new BigDecimal("100.00"),
                false
        );
        when(billRepository.findByIdForUpdate(BILL_ID)).thenReturn(Optional.of(bill));

        BillDepositResponseDTO response = executor.applyDeposit(
                IDEMPOTENCY_KEY,
                BILL_ID,
                new BigDecimal("10.00"),
                EMAIL
        );

        assertThat(bill.getAmount()).isEqualByComparingTo("110.00");
        assertThat(response.amount()).isEqualByComparingTo("110.00");
        assertThat(response.email()).isEqualTo(EMAIL);
        assertThat(response.overdraftEnabled()).isFalse();

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);

        verify(outboxService).saveEvent(
                eq("BILL"),
                eq(BILL_ID.toString()),
                eq("DEPOSIT_CREATED"),
                payload.capture()
        );
        verify(outboxService).saveEvent(
                eq("BILL"),
                eq(BILL_ID.toString()),
                eq("NOTIFICATION_CREATED"),
                payload.capture()
        );
        assertThat(payload.getAllValues()).hasSize(2);
    }

    @Test
    @DisplayName("Fail with 404 semantics when the bill disappeared")
    void rejectsUnknownBill() {
        when(billRepository.findByIdForUpdate(BILL_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> executor.applyDeposit(
                IDEMPOTENCY_KEY,
                BILL_ID,
                new BigDecimal("10.00"),
                EMAIL
        )).isInstanceOf(NotFoundException.class);
    }
}
