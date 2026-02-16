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
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnablePostgresTestConfiguration
class DepositIntegrationTest {

    private static final Long NON_EXISTENT_ID = 99999L;
    private static final Long BILL_ID = 1L;
    private static final String EMAIL = "bamasdfsf@bank.com";
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DepositRepository depositRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @AfterEach
    void clear() {
        depositRepository.deleteAll();
    }

    @Test
    @DisplayName("Should create deposit, persist it and return details")
    void createDeposit_success() throws Exception {
        DepositRequestDTO dto = new DepositRequestDTO(BILL_ID, AMOUNT, EMAIL);

        mockMvc.perform(post("/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.billId").value(BILL_ID))
                .andExpect(jsonPath("$.amount").value(100.00))
                .andExpect(jsonPath("$.email").value(EMAIL));

        List<Deposit> deposits = depositRepository.findAll();
        assertThat(deposits).hasSize(1);
        Deposit savedDeposit = deposits.get(0);
        assertThat(savedDeposit.getEmail()).isEqualTo(EMAIL);
        assertThat(savedDeposit.getAmount()).isEqualByComparingTo(AMOUNT);
        assertThat(savedDeposit.getBillId()).isEqualTo(BILL_ID);
    }

    @Test
    @DisplayName("Should retrieve existing deposit from database")
    void getDeposit_success() throws Exception {
        Deposit saved = depositRepository.save(new Deposit(AMOUNT, BILL_ID, EMAIL, DEFAULT_TIME));

        mockMvc.perform(get("/deposits/" + saved.getDepositId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billId").value(BILL_ID))
                .andExpect(jsonPath("$.amount").value(100.00))
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    @DisplayName("Should return 404 when getting non-existent deposit ID")
    void getDeposit_notFound() throws Exception {
        mockMvc.perform(get("/deposits/" + NON_EXISTENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString(String.valueOf(NON_EXISTENT_ID))));
    }

    @Test
    @DisplayName("Should return 400 when creating deposit with invalid input")
    void createDeposit_invalidInput() throws Exception {
        String invalidJson = """
            {
                "billId": 123,
                "email": "вапварпварыв"
            }
        """;

        mockMvc.perform(post("/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());

        assertThat(depositRepository.count()).isZero();
    }
}