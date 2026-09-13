package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.outbox.OutboxService;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.ForbiddenException;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SandboxDepositProtectionTest {

    @Mock
    private BillRepository repository;

    @Mock
    private AccountQueryGateway accountGateway;

    @Mock
    private OutboxService outbox;

    @Mock
    private AuthenticatedUser user;

    private BillServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BillServiceImpl(
                repository,
                accountGateway,
                outbox,
                user,
                new BigDecimal("10.00"),
                true
        );
    }

    private void role(String assignedRole) {
        when(user.hasRole(anyString()))
                .thenAnswer(invocation ->
                        assignedRole.equals(invocation.getArgument(0))
                );
    }

    @Test
    void disabledSandboxRejectsEvenAdmin() {
        BillServiceImpl disabled = new BillServiceImpl(
                repository,
                accountGateway,
                outbox,
                user,
                new BigDecimal("10.00"),
                false
        );

        assertThrows(
                ForbiddenException.class,
                () -> disabled.depositBill(1L, new BigDecimal("10.00"))
        );

        verifyNoInteractions(repository, accountGateway, outbox, user);
    }

    @Test
    void customerCannotDepositEvenWhenSandboxEnabled() {
        role(BankRoles.CUSTOMER);

        assertThrows(
                ForbiddenException.class,
                () -> service.depositBill(1L, new BigDecimal("10.00"))
        );

        verifyNoInteractions(repository, accountGateway, outbox);
    }

    @Test
    void fractionalCentIsRejectedBeforeDatabaseAccess() {
        role(BankRoles.ADMIN);

        assertThrows(
                BadRequestException.class,
                () -> service.depositBill(1L, new BigDecimal("10.005"))
        );

        verifyNoInteractions(repository, accountGateway, outbox);
    }

    @Test
    void negativeAmountIsRejected() {
        role(BankRoles.ADMIN);

        assertThrows(
                BadRequestException.class,
                () -> service.depositBill(1L, new BigDecimal("-10.00"))
        );

        verifyNoInteractions(repository, accountGateway, outbox);
    }

    @Test
    void employeeDepositUsesEmailFromAccountProfile() {
        role(BankRoles.EMPLOYEE);

        Bill bill = new Bill(10L, new BigDecimal("100.00"), false);
        bill.setBillId(1L);

        when(repository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(bill));

        when(accountGateway.getAccount(10L))
                .thenReturn(new AccountResponseDTO(
                        "owner-subject",
                        "Customer",
                        "verified-profile@example.test",
                        "+375291234567",
                        OffsetDateTime.parse("2025-12-12T12:00:00Z")
                ));

        service.depositBill(1L, new BigDecimal("10.00"));

        assertThat(bill.getAmount()).isEqualByComparingTo("110.00");

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);

        verify(outbox).saveEvent(
                eq("BILL"),
                eq("1"),
                eq("DEPOSIT_CREATED"),
                payload.capture()
        );

        DepositRequestDTO event =
                (DepositRequestDTO) payload.getValue();

        assertThat(event.email())
                .isEqualTo("verified-profile@example.test");
        assertThat(event.amount()).isEqualByComparingTo("10.00");
        assertThat(event.messageId()).isNotNull();

        verify(outbox).saveEvent(
                eq("BILL"),
                eq("1"),
                eq("NOTIFICATION_CREATED"),
                any(DepositRequestDTO.class)
        );
    }
}