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
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
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
    @DisplayName("Should create account, persist it and trigger bill creation event")
    void createAccount_success() throws Exception {
        List<CreateBillRequestDTO> bills = List.of(new CreateBillRequestDTO(AMOUNT, true));
        AccountRequestDTO dto = new AccountRequestDTO(NAME, EMAIL, PHONE, bills);

        String response = mockMvc.perform(post("/accounts")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$", greaterThan(0)))
                .andReturn().getResponse().getContentAsString();

        Long accountId = objectMapper.readValue(response, Long.class);

        Account account = accountRepository.findById(accountId).orElseThrow();
        assertThat(account.getEmail()).isEqualTo(EMAIL);
        assertThat(account.getName()).isEqualTo(NAME);

        verify(billCommandGateway, timeout(2000)).createBillsForAccount(eq(accountId), anyList());
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
    @DisplayName("Should delete account from database and trigger bills deletion event")
    void deleteAccount_success() throws Exception {
        Account saved = accountRepository.save(new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME));

        mockMvc.perform(delete("/accounts/" + saved.getAccountId())
                        .with(adminJwt())) // <-- Добавлен JWT
                .andExpect(status().isNoContent());

        assertThat(accountRepository.findById(saved.getAccountId())).isEmpty();

        verify(billCommandGateway, timeout(2000)).deleteBillsByAccountId(eq(saved.getAccountId()));
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
    @DisplayName("Should return 404 when deleting non-existent account ID")
    void deleteAccount_notFound() throws Exception {
        mockMvc.perform(delete("/accounts/" + NON_EXISTENT_ID)
                        .with(adminJwt()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should return 409 Conflict (or appropriate error) when email already exists")
    void createAccount_duplicateEmail() throws Exception {
        accountRepository.save(new Account(OWNER_SUB, NAME, EMAIL, PHONE, DEFAULT_TIME));

        AccountRequestDTO dto = new AccountRequestDTO("name2", EMAIL, "+143463424324", List.of(new CreateBillRequestDTO(AMOUNT, true)));

        mockMvc.perform(post("/accounts")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already exists")));
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