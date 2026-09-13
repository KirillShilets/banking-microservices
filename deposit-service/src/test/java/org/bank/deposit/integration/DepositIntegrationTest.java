package org.bank.deposit.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.bank.deposit.entity.Deposit;
import org.bank.deposit.repository.DepositRepository;
import org.bank.dto.request.DepositRequestDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnablePostgresTestConfiguration
class DepositIntegrationTest {

    private static final Long NON_EXISTENT_ID = 99999L;
    private static final Long BILL_ID = 100L;

    private static final String EMAIL = "customer@example.test";

    private static final String EMPLOYEE_SUBJECT =
            "11111111-1111-1111-1111-111111111111";

    private static final String CUSTOMER_SUBJECT =
            "22222222-2222-2222-2222-222222222222";

    private static final BigDecimal AMOUNT =
            new BigDecimal("100.00");

    private static final OffsetDateTime DEFAULT_TIME =
            OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DepositRepository depositRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @AfterEach
    void clear() {
        depositRepository.deleteAll();
    }

    private RequestPostProcessor employeeJwt() {
        return jwt()
                .jwt(builder -> builder.subject(EMPLOYEE_SUBJECT))
                .authorities(
                        new SimpleGrantedAuthority("ROLE_employee")
                );
    }

    private RequestPostProcessor customerJwt() {
        return jwt()
                .jwt(builder -> builder.subject(CUSTOMER_SUBJECT))
                .authorities(
                        new SimpleGrantedAuthority("ROLE_customer")
                );
    }

    @Test
    @DisplayName("Deposit records cannot be created through HTTP")
    void createDeposit_endpointAbsent() throws Exception {
        mockMvc.perform(post("/deposits")
                        .with(employeeJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "billId": 1,
                                  "amount": "100.00",
                                  "email": "customer@example.test"
                                }
                                """))
                .andExpect(status().isNotFound());

        assertThat(depositRepository.count()).isZero();
    }

    @Test
    @DisplayName("Employee can read an existing deposit")
    void getDeposit_employee_success() throws Exception {
        Deposit saved = depositRepository.save(
                new Deposit(
                        AMOUNT,
                        BILL_ID,
                        EMAIL,
                        DEFAULT_TIME
                )
        );

        mockMvc.perform(get("/deposits/{depositId}", saved.getDepositId())
                        .with(employeeJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billId").value(BILL_ID))
                .andExpect(jsonPath("$.amount").value(100.00))
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    @DisplayName("Employee receives 404 for a missing deposit")
    void getDeposit_notFound() throws Exception {
        mockMvc.perform(get("/deposits/{depositId}", NON_EXISTENT_ID)
                        .with(employeeJwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath(
                        "$.message",
                        containsString(String.valueOf(NON_EXISTENT_ID))
                ));
    }

    @Test
    @DisplayName("Invalid HTTP creation request is rejected because endpoint is absent")
    void createDeposit_invalidInput() throws Exception {
        String invalidJson = """
                {
                  "billId": 123,
                  "email": "invalid-email"
                }
                """;

        mockMvc.perform(post("/deposits")
                        .with(employeeJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isNotFound());

        assertThat(depositRepository.count()).isZero();
    }

    @Test
    @DisplayName("Unauthenticated request cannot create a deposit")
    void createDeposit_noJwt_unauthorized() throws Exception {
        DepositRequestDTO dto =
                new DepositRequestDTO(BILL_ID, AMOUNT, EMAIL);

        mockMvc.perform(post("/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized());

        assertThat(depositRepository.count()).isZero();
    }

    @Test
    @DisplayName("Unauthenticated request cannot read a deposit")
    void getDeposit_noJwt_unauthorized() throws Exception {
        mockMvc.perform(get("/deposits/{depositId}", NON_EXISTENT_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Customer cannot create a deposit through HTTP")
    void createDeposit_customer_endpointAbsent() throws Exception {
        DepositRequestDTO dto =
                new DepositRequestDTO(BILL_ID, AMOUNT, EMAIL);

        mockMvc.perform(post("/deposits")
                        .with(customerJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isNotFound());

        assertThat(depositRepository.count()).isZero();
    }

    @Test
    @DisplayName("Customer cannot read the employee-only deposit endpoint")
    void getDeposit_customer_forbidden() throws Exception {
        Deposit saved = depositRepository.save(
                new Deposit(
                        AMOUNT,
                        BILL_ID,
                        EMAIL,
                        DEFAULT_TIME
                )
        );

        mockMvc.perform(get("/deposits/{depositId}", saved.getDepositId())
                        .with(customerJwt()))
                .andExpect(status().isForbidden());

        assertThat(
                depositRepository.existsById(saved.getDepositId())
        ).isTrue();
    }
}