package org.bank.account.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.account.entity.Account;
import org.bank.account.messaging.BillCommandGateway;
import org.bank.account.repository.AccountRepository;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.bank.account.controller.dto.AccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountRequestDTO;
import org.bank.dto.request.CreateBillRequestDTO;
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
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThan;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnablePostgresTestConfiguration
class AccountIntegrationTest {

    private static final Long NON_EXISTENT_ID = 99999L;
    private static final String NAME = "name";
    private static final String EMAIL = "test@test.com";
    private static final String PHONE = "+375290000000";
    private static final BigDecimal AMOUNT = BigDecimal.ZERO;
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");
    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BillCommandGateway billCommandGateway;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @AfterEach
    void clear() {
        accountRepository.deleteAll();
    }

    private RequestPostProcessor adminJwt() {
        return jwt()
                .authorities(new SimpleGrantedAuthority("ROLE_admin"))
                .jwt(j -> j.subject(OWNER_SUB)
                        .claim("realm_access", Map.of("roles", List.of("admin"))));
    }

    @Test
    @DisplayName("Unauthenticated request cannot delete an account")
    void deleteAccount_noJwt_unauthorized() throws Exception {
        Account saved = accountRepository.save(
                new Account(
                        OWNER_SUB,
                        NAME,
                        EMAIL,
                        PHONE,
                        DEFAULT_TIME
                )
        );

        mockMvc.perform(delete("/accounts/{accountId}", saved.getAccountId()))
                .andExpect(status().isUnauthorized());

        assertThat(accountRepository.existsById(saved.getAccountId())).isTrue();
    }

    @Test
    @DisplayName("Should create account and request zero-balance bill opening")
    void createAccount_success() throws Exception {
        List<CreateBillRequestDTO> bills = List.of(
                new CreateBillRequestDTO(BigDecimal.ZERO, false)
        );

        AccountRequestDTO request = new AccountRequestDTO(
                NAME,
                EMAIL,
                PHONE,
                bills
        );

        String response = mockMvc.perform(post("/accounts")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$", greaterThan(0)))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long accountId = objectMapper.readValue(response, Long.class);

        Account saved = accountRepository.findById(accountId)
                .orElseThrow();

        assertThat(saved.getOwnerSubject()).isEqualTo(OWNER_SUB);
        assertThat(saved.getEmail()).isEqualTo(EMAIL);
        assertThat(saved.getName()).isEqualTo(NAME);

        verify(billCommandGateway, timeout(5000))
                .createBillsForAccount(
                        eq(accountId),
                        eq(bills)
                );
    }

    @Test
    @DisplayName("Should retrieve existing account from database")
    void getAccount_success() throws Exception {
        Account saved = accountRepository.save(new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME));

        mockMvc.perform(get("/accounts/" + saved.getAccountId())
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.name").value(NAME));
    }

    @Test
    @DisplayName("Should update account details in database via API")
    void updateAccount_success() throws Exception {
        Account saved = accountRepository.save(new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME));
        UpdateAccountRequestDTO dto = new UpdateAccountRequestDTO("update-name", EMAIL, PHONE);

        mockMvc.perform(put("/accounts/" + saved.getAccountId())
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("update-name"));

        Account updatedAccount = accountRepository.findById(saved.getAccountId()).orElseThrow();
        assertThat(updatedAccount.getName()).isEqualTo("update-name");
    }

    @Test
    @DisplayName("Should return 404 when getting non-existent account ID")
    void getAccount_notFound() throws Exception {
        mockMvc.perform(get("/accounts/" + NON_EXISTENT_ID)
                        .with(adminJwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString(String.valueOf(NON_EXISTENT_ID))));
    }

    @Test
    @DisplayName("Should reject duplicate email for a different account owner")
    void createAccount_duplicateEmail() throws Exception {
        String existingOwnerSubject =
                "22222222-2222-2222-2222-222222222222";

        Account existing = accountRepository.save(
                new Account(
                        existingOwnerSubject,
                        NAME,
                        EMAIL,
                        PHONE,
                        DEFAULT_TIME
                )
        );

        long countBeforeRequest = accountRepository.count();

        AccountRequestDTO request = new AccountRequestDTO(
                "Another Customer",
                EMAIL,
                "+375291234568",
                List.of(
                        new CreateBillRequestDTO(
                                BigDecimal.ZERO,
                                false
                        )
                )
        );

        mockMvc.perform(post("/accounts")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertThat(accountRepository.count()).isEqualTo(countBeforeRequest);

        assertThat(accountRepository.findByOwnerSubject(OWNER_SUB))
                .isEmpty();

        Account unchanged = accountRepository.findById(
                existing.getAccountId()
        ).orElseThrow();

        assertThat(unchanged.getOwnerSubject())
                .isEqualTo(existingOwnerSubject);
        assertThat(unchanged.getEmail()).isEqualTo(EMAIL);
    }

    @Test
    @DisplayName("Account physical deletion is not exposed")
    void deleteAccount_methodNotAllowed() throws Exception {
        Account saved = accountRepository.save(
                new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME)
        );

        mockMvc.perform(delete("/accounts/{id}", saved.getAccountId())
                        .with(adminJwt()))
                .andExpect(status().isMethodNotAllowed());

        assertThat(accountRepository.existsById(saved.getAccountId())).isTrue();
    }

    @Test
    @DisplayName("Should return 400 when creating account with invalid input")
    void createAccount_invalidInput() throws Exception {
        String invalidJson = """
            {
                "email": "24вым2",
                "phone": ""
            }
        """;

        mockMvc.perform(post("/accounts")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }
}