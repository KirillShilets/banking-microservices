package org.bank.deposit.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.deposit.service.DepositService;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.DepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.bank.exception.handler.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class DepositControllerUnitTest {

    private static final Long DEPOSIT_ID = 1L;
    private static final Long NON_EXISTENT_ID = 99L;
    private static final Long BILL_ID = 100L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final String EMAIL = "test@yandex.com";
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Mock
    private DepositService depositService;

    @InjectMocks
    private DepositController depositController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        objectMapper = new ObjectMapper().findAndRegisterModules();

        mockMvc = MockMvcBuilders.standaloneSetup(depositController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("Should create deposit and return created details")
    void saveDeposit_success() throws Exception {
        DepositRequestDTO requestDTO = new DepositRequestDTO(BILL_ID, AMOUNT, EMAIL);
        DepositResponseDTO responseDTO = new DepositResponseDTO(BILL_ID, AMOUNT, EMAIL, DEFAULT_TIME);

        when(depositService.saveDeposit(requestDTO.billId(), requestDTO.amount(), requestDTO.email()))
                .thenReturn(responseDTO);

        mockMvc.perform(post("/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isCreated())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.billId").value(BILL_ID))
                .andExpect(jsonPath("$.amount").value(100.00))
                .andExpect(jsonPath("$.email").value(EMAIL));

        verify(depositService).saveDeposit(requestDTO.billId(), requestDTO.amount(), requestDTO.email());
    }

    @Test
    @DisplayName("Should return deposit details when deposit exists")
    void getDeposit_success() throws Exception {
        DepositResponseDTO responseDTO = new DepositResponseDTO(BILL_ID, AMOUNT, EMAIL, DEFAULT_TIME);

        when(depositService.getDeposit(DEPOSIT_ID)).thenReturn(responseDTO);

        mockMvc.perform(get("/deposits/{depositId}", DEPOSIT_ID))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.billId").value(BILL_ID))
                .andExpect(jsonPath("$.email").value(EMAIL));

        verify(depositService).getDeposit(DEPOSIT_ID);
    }

    @Test
    @DisplayName("Should return 404 Not Found when getting non-existent deposit")
    void getDeposit_notFound() throws Exception {
        when(depositService.getDeposit(NON_EXISTENT_ID))
                .thenThrow(new NotFoundException("Deposit not found"));

        mockMvc.perform(get("/deposits/{depositId}", NON_EXISTENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Deposit not found"))
                .andExpect(jsonPath("$.timestamp").value(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T.*")));
    }

    @Test
    @DisplayName("Should return 400 Bad Request when input validation fails")
    void saveDeposit_validationError() throws Exception {
        DepositRequestDTO invalidDto = new DepositRequestDTO(null, null, "invalid");

        mockMvc.perform(post("/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists());

        verifyNoInteractions(depositService);
    }
}