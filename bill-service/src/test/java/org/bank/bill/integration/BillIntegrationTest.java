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

@AutoConfigureMockMvc
@EnablePostgresTestConfiguration
@SpringBootTest(properties = "app.sandbox.deposits-enabled=true")
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
    @DisplayName("New bill is persisted with zero balance and without overdraft")
    void createBill_success() throws Exception {
        BillRequestDTO request = new BillRequestDTO(
                ACCOUNT_ID,
                BigDecimal.ZERO,
                false
        );

        String response = mockMvc.perform(post("/bills")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long billId = objectMapper.readValue(response, Long.class);

        Bill saved = billRepository.findById(billId).orElseThrow();

        assertThat(saved.getAccountId()).isEqualTo(ACCOUNT_ID);
        assertThat(saved.getAmount()).isEqualByComparingTo("0.00");
        assertThat(saved.getOverdraftEnabled()).isFalse();
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
    @DisplayName("Even admin cannot use PUT to modify bill financial fields")
    void updateBill_methodNotAllowed() throws Exception {
        Bill saved = billRepository.save(
                new Bill(ACCOUNT_ID, AMOUNT_100, false)
        );

        BillRequestDTO request = new BillRequestDTO(
                ACCOUNT_ID + 1,
                AMOUNT_200,
                true
        );

        mockMvc.perform(put("/bills/{billId}", saved.getBillId())
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().exists("Allow"))
                .andExpect(jsonPath("$.status").value(405));

        Bill actual = billRepository.findById(saved.getBillId())
                .orElseThrow();

        assertThat(actual.getAccountId()).isEqualTo(ACCOUNT_ID);
        assertThat(actual.getAmount()).isEqualByComparingTo(AMOUNT_100);
        assertThat(actual.getOverdraftEnabled()).isFalse();
    }

    @Test
    @DisplayName("Should process sandbox deposit and update DB amount")
    void depositBill_success() throws Exception {
        Bill bill = billRepository.save(
                new Bill(ACCOUNT_ID, AMOUNT_100, false)
        );

        String json = """
            {
                "billId": %d,
                "amount": "10.00"
            }
            """.formatted(bill.getBillId());

        mockMvc.perform(post("/bills/sandbox/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(110.00))
                .andExpect(jsonPath("$.email").value(EMAIL));

        Bill updated = billRepository
                .findById(bill.getBillId())
                .orElseThrow();

        assertThat(updated.getAmount())
                .isEqualByComparingTo("110.00");
    }

    @Test
    @DisplayName("Physical bill deletion is not exposed")
    void deleteBill_methodNotAllowed() throws Exception {
        Bill bill = billRepository.save(
                new Bill(ACCOUNT_ID, AMOUNT_100, false)
        );

        mockMvc.perform(delete("/bills/{id}", bill.getBillId())
                        .with(adminJwt()))
                .andExpect(status().isMethodNotAllowed());

        assertThat(billRepository.existsById(bill.getBillId())).isTrue();
    }

    @Test
    @DisplayName("Batch bill deletion is not exposed")
    void deleteBillsByAccount_methodNotAllowed() throws Exception {
        Bill bill = billRepository.save(
                new Bill(ACCOUNT_ID, AMOUNT_100, false)
        );

        mockMvc.perform(delete("/bills/accounts/{id}", ACCOUNT_ID)
                        .with(adminJwt()))
                .andExpect(status().isMethodNotAllowed());

        assertThat(billRepository.existsById(bill.getBillId())).isTrue();
    }

    @Test
    @DisplayName("Sandbox accepts an exact decimal string")
    void sandboxDeposit_decimalString_success() throws Exception {
        Bill bill = billRepository.save(
                new Bill(ACCOUNT_ID, AMOUNT_100, false)
        );

        String json = """
            {
                "billId": %d,
                "amount": "10.25"
            }
            """.formatted(bill.getBillId());

        mockMvc.perform(post("/bills/sandbox/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());

        Bill actual = billRepository.findById(bill.getBillId()).orElseThrow();

        assertThat(actual.getAmount()).isEqualByComparingTo("110.25");
    }

    @Test
    @DisplayName("Customer cannot assign a non-zero opening balance")
    void createBill_customerNonZeroBalance_rejected() throws Exception {
        long initialCount = billRepository.count();

        BillRequestDTO request = new BillRequestDTO(
                ACCOUNT_ID,
                AMOUNT_100,
                false
        );

        mockMvc.perform(post("/bills")
                        .with(customerJwt(OWNER_SUB))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        assertThat(billRepository.count()).isEqualTo(initialCount);
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
    @DisplayName("Should return 400 when sandbox deposit is below minimum")
    void depositBill_amountTooLow() throws Exception {
        Bill bill = billRepository.save(
                new Bill(ACCOUNT_ID, AMOUNT_100, false)
        );

        String json = """
            {
                "billId": %d,
                "amount": "1.00"
            }
            """.formatted(bill.getBillId());

        mockMvc.perform(post("/bills/sandbox/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value(containsString("less than minimum")));

        Bill unchanged = billRepository
                .findById(bill.getBillId())
                .orElseThrow();

        assertThat(unchanged.getAmount())
                .isEqualByComparingTo(AMOUNT_100);
    }

    @Test
    @DisplayName("Sandbox deposit uses email from account profile")
    void depositBill_usesEmailFromAccountProfile() throws Exception {
        Bill bill = billRepository.save(
                new Bill(ACCOUNT_ID, AMOUNT_100, false)
        );

        String json = """
            {
                "billId": %d,
                "amount": "10.00"
            }
            """.formatted(bill.getBillId());

        mockMvc.perform(post("/bills/sandbox/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(110.00))
                .andExpect(jsonPath("$.email").value(EMAIL));

        Bill actualBill = billRepository
                .findById(bill.getBillId())
                .orElseThrow();

        assertThat(actualBill.getAmount())
                .isEqualByComparingTo("110.00");
    }

    @Test
    @DisplayName("Should return 404 for non-existent sandbox deposit bill")
    void depositBill_billNotFound() throws Exception {
        String json = """
            {
                "billId": %d,
                "amount": "10.00"
            }
            """.formatted(NON_EXISTENT_ID);

        mockMvc.perform(post("/bills/sandbox/deposits")
                        .with(adminJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
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