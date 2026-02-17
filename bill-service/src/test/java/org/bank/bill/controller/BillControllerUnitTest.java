package org.bank.bill.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.bill.service.BillService;
import org.bank.dto.request.BillRequestDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.exception.BadRequestException;
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
import java.util.List;

import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class BillControllerUnitTest {

    private static final Long BILL_ID = 1L;
    private static final Long ACCOUNT_ID = 1L;
    private static final Long NON_EXISTENT_ID = 99L;
    private static final String EMAIL = "test@test.com";
    private static final BigDecimal AMOUNT_100 = new BigDecimal("100.00");
    private static final BigDecimal AMOUNT_200 = new BigDecimal("200.00");
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Mock
    private BillService billService;

    @InjectMocks
    private BillController billController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        objectMapper = new ObjectMapper().findAndRegisterModules();

        mockMvc = MockMvcBuilders.standaloneSetup(billController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("Should return bill details when bill exists")
    void getBill_success() throws Exception {
        BillResponseDTO bill = new BillResponseDTO(BILL_ID, ACCOUNT_ID, AMOUNT_100, true, DEFAULT_TIME, true);
        when(billService.getBill(BILL_ID)).thenReturn(bill);

        mockMvc.perform(get("/bills/{id}", BILL_ID))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.billId").value(BILL_ID))
                .andExpect(jsonPath("$.accountId").value(ACCOUNT_ID));

        verify(billService).getBill(BILL_ID);
    }

    @Test
    @DisplayName("Should return list of bills when querying by account ID")
    void getBillsByAccountId_success() throws Exception {
        BillResponseDTO bill1 = new BillResponseDTO(BILL_ID, ACCOUNT_ID, AMOUNT_100, true, DEFAULT_TIME, true);
        BillResponseDTO bill2 = new BillResponseDTO(2L, ACCOUNT_ID, AMOUNT_100, false, DEFAULT_TIME, false);

        when(billService.getBillsByAccountId(ACCOUNT_ID)).thenReturn(List.of(bill1, bill2));

        mockMvc.perform(get("/bills/accounts/{accountId}", ACCOUNT_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        verify(billService).getBillsByAccountId(ACCOUNT_ID);
    }

    @Test
    @DisplayName("Should create bill and return Location header")
    void createBill_success() throws Exception {
        BillRequestDTO dto = new BillRequestDTO(ACCOUNT_ID, AMOUNT_100, true);
        when(billService.createBill(dto.accountId(), dto.amount(), dto.overdraftEnabled())).thenReturn(BILL_ID);

        mockMvc.perform(post("/bills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").value(BILL_ID))
                .andExpect(header().string("Location", matchesPattern(".*/bills/" + BILL_ID + "$")));

        verify(billService).createBill(dto.accountId(), dto.amount(), dto.overdraftEnabled());
    }

    @Test
    @DisplayName("Should create multiple bills for account")
    void createBillsForAccount_success() throws Exception {
        List<CreateBillRequestDTO> bills = List.of(new CreateBillRequestDTO(AMOUNT_100, true));
        when(billService.createBillsForAccount(eq(ACCOUNT_ID), anyList())).thenReturn(List.of(BILL_ID));

        mockMvc.perform(post("/bills/accounts/{accountId}", ACCOUNT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bills)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0]").value(BILL_ID));

        verify(billService).createBillsForAccount(eq(ACCOUNT_ID), anyList());
    }

    @Test
    @DisplayName("Should update bill and return updated details")
    void updateBill_success() throws Exception {
        BillRequestDTO dto = new BillRequestDTO(ACCOUNT_ID, AMOUNT_100, true);
        BillResponseDTO updated = new BillResponseDTO(BILL_ID, ACCOUNT_ID, AMOUNT_100, true, DEFAULT_TIME, true);

        when(billService.updateBill(BILL_ID, dto.accountId(), dto.amount(), dto.overdraftEnabled())).thenReturn(updated);

        mockMvc.perform(put("/bills/{id}", BILL_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(100.00));

        verify(billService).updateBill(BILL_ID, dto.accountId(), dto.amount(), dto.overdraftEnabled());
    }

    @Test
    @DisplayName("Should deposit to bill and return new balance")
    void depositBill_success() throws Exception {
        DepositRequestDTO dto = new DepositRequestDTO(BILL_ID, AMOUNT_100, EMAIL);
        BillDepositResponseDTO response = new BillDepositResponseDTO(BILL_ID, ACCOUNT_ID, AMOUNT_200, EMAIL, true, true, DEFAULT_TIME);

        when(billService.depositBill(dto.billId(), dto.amount(), dto.email())).thenReturn(response);

        mockMvc.perform(post("/bills/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(200.00));

        verify(billService).depositBill(dto.billId(), dto.amount(), dto.email());
    }

    @Test
    @DisplayName("Should delete bill and return No Content")
    void deleteBill_success() throws Exception {
        doNothing().when(billService).deleteBill(BILL_ID);

        mockMvc.perform(delete("/bills/{id}", BILL_ID))
                .andExpect(status().isNoContent());

        verify(billService).deleteBill(BILL_ID);
    }

    @Test
    @DisplayName("Should delete all bills for account and return No Content")
    void deleteBillsByAccountId_success() throws Exception {
        doNothing().when(billService).deleteBillsByAccountId(ACCOUNT_ID);

        mockMvc.perform(delete("/bills/accounts/{accountId}", ACCOUNT_ID))
                .andExpect(status().isNoContent());

        verify(billService).deleteBillsByAccountId(ACCOUNT_ID);
    }

    @Test
    @DisplayName("Should return 404 Not Found when getting non-existent bill")
    void getBill_notFound() throws Exception {
        when(billService.getBill(NON_EXISTENT_ID)).thenThrow(new NotFoundException("Bill not found"));

        mockMvc.perform(get("/bills/{id}", NON_EXISTENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Bill not found"))
                .andExpect(jsonPath("$.timestamp").value(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T.*")));
    }

    @Test
    @DisplayName("Should return 400 Bad Request when deposit logic fails")
    void depositBill_badRequest() throws Exception {
        DepositRequestDTO dto = new DepositRequestDTO(BILL_ID, AMOUNT_100, EMAIL);

        when(billService.depositBill(dto.billId(), dto.amount(), dto.email()))
                .thenThrow(new BadRequestException("Deposit too small"));

        mockMvc.perform(post("/bills/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Deposit too small"))
                .andExpect(jsonPath("$.timestamp").value(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T.*")));
    }

    @Test
    @DisplayName("Should return 404 Not Found when deleting non-existent bill")
    void deleteBill_notFound() throws Exception {
        doThrow(new NotFoundException("Bill not found")).when(billService).deleteBill(NON_EXISTENT_ID);

        mockMvc.perform(delete("/bills/{id}", NON_EXISTENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Bill not found"))
                .andExpect(jsonPath("$.timestamp").value(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T.*")));
    }

    @Test
    @DisplayName("Should return 400 Bad Request when input validation fails")
    void createBill_validationError() throws Exception {
        BillRequestDTO invalidDto = new BillRequestDTO(1L, new BigDecimal("-100.00"), true);

        mockMvc.perform(post("/bills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists());

        verifyNoInteractions(billService);
    }
}