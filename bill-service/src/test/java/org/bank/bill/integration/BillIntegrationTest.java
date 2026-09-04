package org.bank.bill.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.bill.entity.Bill;
import org.bank.bill.messaging.AccountQueryGateway;
import org.bank.bill.messaging.DepositCommandGateway;
import org.bank.bill.messaging.NotificationCommandGateway;
import org.bank.bill.repository.BillRepository;
import org.bank.config.annotation.EnablePostgresTestConfiguration;
import org.bank.dto.request.BillRequestDTO;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;          // <-- новый
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;           // <-- новый

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThan;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt; // <-- новый
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnablePostgresTestConfiguration
class BillIntegrationTest {

    private static final Long ACCOUNT_ID = 10L;
    private static final Long NON_EXISTENT_ID = 99999L;
    private static final String ACCOUNT_NAME = "AndreyName";
    private static final String EMAIL = "test@test.com";
    private static final String WRONG_EMAIL = "hacker@test.com";
    private static final String PHONE = "+375290000000";
    private static final BigDecimal AMOUNT_100 = new BigDecimal("100.00");
    private static final BigDecimal AMOUNT_200 = new BigDecimal("200.00");
    private static final BigDecimal DEPOSIT_AMOUNT_10 = new BigDecimal("10.00");
    private static final BigDecimal TINY_AMOUNT = new BigDecimal("1.00");
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");
    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final String OTHER_SUB = "22222222-2222-2222-2222-222222222222";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AccountQueryGateway accountQueryGateway;

    @MockitoBean
    private NotificationCommandGateway notificationCommandGateway;

    @MockitoBean
    private DepositCommandGateway depositCommandGateway;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setup() {
        when(accountQueryGateway.getAccount(anyLong()))
                .thenReturn(new AccountResponseDTO(OWNER_SUB, ACCOUNT_NAME, EMAIL, PHONE, DEFAULT_TIME));
    }

    @AfterEach
    void clear() {
        billRepository.deleteAll();
    }

    private RequestPostProcessor adminJwt() {
        return jwt()
                .authorities(new SimpleGrantedAuthority("ROLE_admin"))
                .jwt(j -> j.subject(OWNER_SUB)
                        .claim("realm_access", Map.of("roles", List.of("admin"))));
    }

    private RequestPostProcessor customerJwt(String subject) {
        return jwt()
                .authorities(new SimpleGrantedAuthority("ROLE_customer"))
                .jwt(j -> j.subject(subject)
                        .claim("realm_access", Map.of("roles", List.of("customer"))));
    }

    @Test
    @DisplayName("Should create bill and persist it correctly in database")
    void createBill_success() throws Exception {
        BillRequestDTO dto = new BillRequestDTO(ACCOUNT_ID, AMOUNT_100, true);

        String response = mockMvc.perform(post("/bills")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$", greaterThan(0)))
                .andReturn().getResponse().getContentAsString();

        Long billId = objectMapper.readValue(response, Long.class);

        Bill bill = billRepository.findById(billId).orElseThrow();
        assertThat(bill.getAccountId()).isEqualTo(ACCOUNT_ID);
        assertThat(bill.getAmount()).isEqualByComparingTo(AMOUNT_100);
    }

    @Test
    @DisplayName("Should retrieve existing bill from database")
    void getBill_success() throws Exception {
        Bill saved = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, true));

        mockMvc.perform(get("/bills/" + saved.getBillId())
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billId").value(saved.getBillId()))
                .andExpect(jsonPath("$.amount").value(100.00));
    }

    @Test
    @DisplayName("Should return bill to customer who owns the account")
    void getBill_customerOwner_success() throws Exception {
        Bill saved = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, true));

        mockMvc.perform(get("/bills/" + saved.getBillId())
                        .with(customerJwt(OWNER_SUB)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should return 403 when customer requests someone else's bill")
    void getBill_customerForeign_forbidden() throws Exception {
        Bill saved = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, true));

        mockMvc.perform(get("/bills/" + saved.getBillId())
                        .with(customerJwt(OTHER_SUB)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should return 401 without JWT")
    void getBill_noJwt_unauthorized() throws Exception {
        Bill saved = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, true));

        mockMvc.perform(get("/bills/" + saved.getBillId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should update bill amount in database via API")
    void updateBill_success() throws Exception {
        Bill bill = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, true));
        BillRequestDTO dto = new BillRequestDTO(ACCOUNT_ID, AMOUNT_200, true);

        mockMvc.perform(put("/bills/" + bill.getBillId())
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(200.00));

        Bill updatedBill = billRepository.findById(bill.getBillId()).orElseThrow();
        assertThat(updatedBill.getAmount()).isEqualByComparingTo(AMOUNT_200);
    }

    @Test
    @DisplayName("Should process deposit, update DB amount and trigger external notifications")
    void depositBill_success() throws Exception {
        Bill bill = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, false));
        DepositRequestDTO dto = new DepositRequestDTO(bill.getBillId(), DEPOSIT_AMOUNT_10, EMAIL);

        mockMvc.perform(post("/bills/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(110.00));

        Bill updated = billRepository.findById(bill.getBillId()).orElseThrow();
        assertThat(updated.getAmount()).isEqualByComparingTo("110.00");

        verify(notificationCommandGateway, timeout(2000)).sendDepositNotification(any());
        verify(depositCommandGateway, timeout(2000)).saveDeposit(any());
    }

    @Test
    @DisplayName("Should delete bill from database")
    void deleteBill_success() throws Exception {
        Bill bill = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, true));

        mockMvc.perform(delete("/bills/" + bill.getBillId())
                        .with(adminJwt()))
                .andExpect(status().isNoContent());

        assertThat(billRepository.findById(bill.getBillId())).isEmpty();
    }

    @Test
    @DisplayName("Should return 404 when getting non-existent bill ID")
    void getBill_notFound() throws Exception {
        mockMvc.perform(get("/bills/" + NON_EXISTENT_ID)
                        .with(adminJwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString(String.valueOf(NON_EXISTENT_ID))));
    }

    @Test
    @DisplayName("Should return 404 when deleting non-existent bill ID")
    void deleteBill_notFound() throws Exception {
        mockMvc.perform(delete("/bills/" + NON_EXISTENT_ID)
                        .with(adminJwt()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should return 400 when deposit amount is less than configured minimum")
    void depositBill_amountTooLow() throws Exception {
        Bill bill = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, false));
        DepositRequestDTO dto = new DepositRequestDTO(bill.getBillId(), TINY_AMOUNT, EMAIL);

        mockMvc.perform(post("/bills/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("less than minimum")));

        Bill notUpdated = billRepository.findById(bill.getBillId()).orElseThrow();
        assertThat(notUpdated.getAmount()).isEqualByComparingTo(AMOUNT_100);

        verify(notificationCommandGateway, never()).sendDepositNotification(any());
        verify(depositCommandGateway, never()).saveDeposit(any());
    }

    @Test
    @DisplayName("Should return 400 when provided email does not match account owner")
    void depositBill_emailMismatch() throws Exception {
        Bill bill = billRepository.save(new Bill(ACCOUNT_ID, AMOUNT_100, false));
        DepositRequestDTO dto = new DepositRequestDTO(bill.getBillId(), DEPOSIT_AMOUNT_10, WRONG_EMAIL);

        mockMvc.perform(post("/bills/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("does not belong to account owner")));

        Bill notUpdated = billRepository.findById(bill.getBillId()).orElseThrow();
        assertThat(notUpdated.getAmount()).isEqualByComparingTo(AMOUNT_100);

        verify(notificationCommandGateway, never()).sendDepositNotification(any());
        verify(depositCommandGateway, never()).saveDeposit(any());
    }

    @Test
    @DisplayName("Should return 404 when attempting deposit to non-existent bill")
    void depositBill_billNotFound() throws Exception {
        DepositRequestDTO dto = new DepositRequestDTO(NON_EXISTENT_ID, DEPOSIT_AMOUNT_10, EMAIL);

        mockMvc.perform(post("/bills/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should return 400 when creating bill with malformed JSON input")
    void createBill_invalidInput() throws Exception {
        String invalidJson = """
            {
                "amount": "100.00",
                "overdraftEnabled": true
            }
        """;

        mockMvc.perform(post("/bills")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }
}