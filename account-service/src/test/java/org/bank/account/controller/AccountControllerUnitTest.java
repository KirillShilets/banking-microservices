package org.bank.account.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.account.controller.dto.AccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountRequestDTO;
import org.bank.account.controller.dto.UpdateAccountResponseDTO;
import org.bank.account.service.AccountService;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.response.AccountResponseDTO;
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
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AccountControllerUnitTest {

    private static final Long ACCOUNT_ID = 1L;
    private static final Long NON_EXISTENT_ID = 99L;
    private static final String NAME = "name";
    private static final String EMAIL = "fdgdfgdfsgsd@test.com";
    private static final String PHONE = "+17373482929";
    private static final String UPDATED_NAME = "Kira";
    private static final OffsetDateTime DEFAULT_TIME = OffsetDateTime.parse("2025-12-12T12:00:00Z");

    @Mock
    private AccountService accountService;

    @InjectMocks
    private AccountController accountController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        objectMapper = new ObjectMapper().findAndRegisterModules();

        mockMvc = MockMvcBuilders.standaloneSetup(accountController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("Should return account details when account exists")
    void getAccount_success() throws Exception {
        AccountResponseDTO accountResponse = new AccountResponseDTO(
                NAME, EMAIL, PHONE, DEFAULT_TIME
        );

        when(accountService.getAccount(ACCOUNT_ID)).thenReturn(accountResponse);

        mockMvc.perform(get("/accounts/{accountId}", ACCOUNT_ID))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email").value(EMAIL));

        verify(accountService).getAccount(ACCOUNT_ID);
    }

    @Test
    @DisplayName("Should create account and return Location header")
    void createAccount_success() throws Exception {
        List<CreateBillRequestDTO> bills = List.of(new CreateBillRequestDTO(BigDecimal.TEN, true));
        AccountRequestDTO dto = new AccountRequestDTO(NAME, EMAIL, PHONE, bills);

        when(accountService.createAccount(dto.name(), dto.email(), dto.phone(), dto.bills()))
                .thenReturn(ACCOUNT_ID);

        mockMvc.perform(post("/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").value(ACCOUNT_ID))
                .andExpect(header().string("Location", matchesPattern(".*/accounts/" + ACCOUNT_ID + "$")));

        verify(accountService).createAccount(dto.name(), dto.email(), dto.phone(), dto.bills());
    }

    @Test
    @DisplayName("Should update account and return updated details")
    void updateAccount_success() throws Exception {
        UpdateAccountRequestDTO updateRequest = new UpdateAccountRequestDTO(UPDATED_NAME, EMAIL, PHONE);
        UpdateAccountResponseDTO updateResponse = new UpdateAccountResponseDTO(
                ACCOUNT_ID, UPDATED_NAME, EMAIL, PHONE
        );

        when(accountService.updateAccount(ACCOUNT_ID, updateRequest.name(), updateRequest.email(), updateRequest.phone()))
                .thenReturn(updateResponse);

        mockMvc.perform(put("/accounts/{accountId}", ACCOUNT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(UPDATED_NAME))
                .andExpect(jsonPath("$.email").value(EMAIL));

        verify(accountService).updateAccount(ACCOUNT_ID, updateRequest.name(), updateRequest.email(), updateRequest.phone());
    }

    @Test
    @DisplayName("Should delete account and return No Content")
    void deleteAccount_success() throws Exception {
        doNothing().when(accountService).deleteAccount(ACCOUNT_ID);

        mockMvc.perform(delete("/accounts/{accountId}", ACCOUNT_ID))
                .andExpect(status().isNoContent());

        verify(accountService).deleteAccount(ACCOUNT_ID);
    }

    @Test
    @DisplayName("Should return 404 Not Found when getting non-existent account")
    void getAccount_notFound() throws Exception {
        when(accountService.getAccount(NON_EXISTENT_ID)).thenThrow(new NotFoundException("Account not found"));

        mockMvc.perform(get("/accounts/{accountId}", NON_EXISTENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Account not found"))
                .andExpect(jsonPath("$.timestamp").value(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T.*")));
    }

    @Test
    @DisplayName("Should return 404 Not Found when deleting non-existent account")
    void deleteAccount_notFound() throws Exception {
        doThrow(new NotFoundException("Account not found")).when(accountService).deleteAccount(NON_EXISTENT_ID);

        mockMvc.perform(delete("/accounts/{accountId}", NON_EXISTENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Account not found"));
    }

    @Test
    @DisplayName("Should return 400 Bad Request when input validation fails")
    void createAccount_validationError() throws Exception {
        AccountRequestDTO invalidDto = new AccountRequestDTO(NAME, "invalid", PHONE, Collections.emptyList());

        mockMvc.perform(post("/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists());

        verifyNoInteractions(accountService);
    }
}