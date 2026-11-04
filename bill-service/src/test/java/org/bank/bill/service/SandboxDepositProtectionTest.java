package org.bank.bill.service;

import org.bank.bill.config.DepositProperties;
import org.bank.bill.config.SandboxProperties;
import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.ForbiddenException;
import org.bank.security.BankRoles;
import org.bank.security.web.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SandboxDepositProtectionTest {

    @Mock
    private BillRepository repository;

    @Mock
    private AccountQueryGateway accountGateway;

    @Mock
    private BillOpeningExecutor openingExecutor;

    @Mock
    private BillDepositExecutor depositExecutor;

    @Mock
    private AuthenticatedUser user;

    private BillServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BillServiceImpl(
                repository,
                accountGateway,
                openingExecutor,
                depositExecutor,
                user,
                new DepositProperties(new BigDecimal("10.00")),
                new SandboxProperties(true)
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
                openingExecutor,
                depositExecutor,
                user,
                new DepositProperties(new BigDecimal("10.00")),
                new SandboxProperties(false)
        );

        assertThrows(
                ForbiddenException.class,
                () -> disabled.depositBill(1L, new BigDecimal("10.00"))
        );

        verifyNoInteractions(repository, accountGateway, depositExecutor, user);
    }

    @Test
    void customerCannotDepositEvenWhenSandboxEnabled() {
        role(BankRoles.CUSTOMER);

        assertThrows(
                ForbiddenException.class,
                () -> service.depositBill(1L, new BigDecimal("10.00"))
        );

        verifyNoInteractions(repository, accountGateway, depositExecutor);
    }

    @Test
    void fractionalCentIsRejectedBeforeDatabaseAccess() {
        role(BankRoles.ADMIN);

        assertThrows(
                BadRequestException.class,
                () -> service.depositBill(1L, new BigDecimal("10.005"))
        );

        verifyNoInteractions(repository, accountGateway, depositExecutor);
    }

    @Test
    void negativeAmountIsRejected() {
        role(BankRoles.ADMIN);

        assertThrows(
                BadRequestException.class,
                () -> service.depositBill(1L, new BigDecimal("-10.00"))
        );

        verifyNoInteractions(repository, accountGateway, depositExecutor);
    }

    @Test
    void employeeDepositUsesEmailFromAccountProfile() {
        role(BankRoles.EMPLOYEE);

        Bill bill = new Bill(10L, "owner-subject", new BigDecimal("100.00"), false);
        bill.setBillId(1L);

        when(repository.findById(1L))
                .thenReturn(Optional.of(bill));

        when(accountGateway.getAccount(10L))
                .thenReturn(new AccountResponseDTO(
                        "owner-subject",
                        "Customer",
                        "verified-profile@example.test",
                        "+375291234567",
                        OffsetDateTime.parse("2025-12-12T12:00:00Z")
                ));

        BillDepositResponseDTO deposited = new BillDepositResponseDTO(
                1L,
                10L,
                new BigDecimal("110.00"),
                "verified-profile@example.test",
                false,
                false,
                OffsetDateTime.parse("2025-12-12T12:00:00Z")
        );

        when(depositExecutor.applyDeposit(
                1L,
                new BigDecimal("10.00"),
                "verified-profile@example.test"
        )).thenReturn(deposited);

        service.depositBill(1L, new BigDecimal("10.00"));

        verify(depositExecutor).applyDeposit(
                1L,
                new BigDecimal("10.00"),
                "verified-profile@example.test"
        );
    }
}