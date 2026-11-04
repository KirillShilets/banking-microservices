package org.bank.bill.integration;

import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.messaging.DepositCommandGateway;
import org.bank.bill.messaging.NotificationCommandGateway;
import org.bank.bill.outbox.OutboxRepository;
import org.bank.bill.repository.BillRepository;
import org.bank.bill.service.BillService;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.bank.dto.response.AccountResponseDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Proves the behaviour of the balance update path under contention instead of
 * asserting it in prose: every parallel deposit must be applied exactly once and
 * must leave exactly one deposit event plus one notification event behind.
 *
 * <p>Runs against a real PostgreSQL container because the guarantee under test
 * is {@code SELECT ... FOR UPDATE}; an in-memory database cannot reproduce it.
 */
@EnablePostgresTestConfiguration
@SpringBootTest(properties = {
        "app.sandbox.deposits-enabled=true",
        // Keep the outbox relay out of the way: this test asserts the rows the
        // deposit transaction wrote, not their delivery state.
        "app.outbox.scheduler.fixed-delay=3600000",
        "spring.datasource.hikari.maximum-pool-size=20"
})
@Tag("integration")
@DisplayName("Concurrent sandbox deposits")
class BillConcurrencyTest {

    private static final int PARALLEL_DEPOSITS = 10;
    private static final BigDecimal DEPOSIT_AMOUNT = new BigDecimal("10.00");
    private static final Long ACCOUNT_ID = 10L;
    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";

    @Autowired
    private BillService billService;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private OutboxRepository outboxRepository;

    @MockitoBean
    private AccountQueryGateway accountQueryGateway;

    @MockitoBean
    private DepositCommandGateway depositCommandGateway;

    @MockitoBean
    private NotificationCommandGateway notificationCommandGateway;

    private Long billId;

    @BeforeEach
    void setUp() {
        when(accountQueryGateway.getAccount(anyLong()))
                .thenReturn(new AccountResponseDTO(
                        OWNER_SUB,
                        "Customer",
                        "customer@example.test",
                        "+375290000000",
                        OffsetDateTime.parse("2025-12-12T12:00:00Z")
                ));

        billId = billRepository.save(
                new Bill(ACCOUNT_ID, new BigDecimal("0.00"), false)
        ).getBillId();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        outboxRepository.deleteAll();
        billRepository.deleteAll();
    }

    @Test
    @DisplayName("Ten parallel deposits credit the balance exactly ten times")
    void parallelDepositsAreAppliedExactlyOnce() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(PARALLEL_DEPOSITS);
        CountDownLatch startGate = new CountDownLatch(1);
        List<Callable<Void>> deposits = new ArrayList<>();

        for (int index = 0; index < PARALLEL_DEPOSITS; index++) {
            deposits.add(() -> {
                authenticateAsAdmin();
                startGate.await();
                try {
                    billService.depositBill(billId, DEPOSIT_AMOUNT);
                } finally {
                    SecurityContextHolder.clearContext();
                }
                return null;
            });
        }

        try {
            List<Future<Void>> completed = deposits.stream()
                    .map(executor::submit)
                    .toList();

            startGate.countDown();

            for (Future<Void> deposit : completed) {
                deposit.get(60, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(billRepository.findById(billId).orElseThrow().getAmount())
                .isEqualByComparingTo(
                        DEPOSIT_AMOUNT.multiply(BigDecimal.valueOf(PARALLEL_DEPOSITS))
                );

        assertThat(outboxRepository.count())
                .as("one deposit event and one notification event per deposit")
                .isEqualTo(PARALLEL_DEPOSITS * 2L);
    }

    private static void authenticateAsAdmin() {
        Jwt jwt = Jwt.withTokenValue("integration-test-token")
                .header("alg", "none")
                .subject(OWNER_SUB)
                .claim("realm_access", Map.of("roles", List.of("admin")))
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(
                        jwt,
                        List.of(new SimpleGrantedAuthority("ROLE_admin")),
                        OWNER_SUB
                )
        );
    }
}
