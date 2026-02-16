package org.bank.notification.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.exception.handler.GlobalExceptionHandler;
import org.bank.notification.service.NotificationService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class NotificationControllerUnitTest {

    private static final Long BILL_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final String EMAIL = "test@test.com";

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationController notificationController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        objectMapper = new ObjectMapper().findAndRegisterModules();

        mockMvc = MockMvcBuilders.standaloneSetup(notificationController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("Should send deposit notification and return response details")
    void sendDepositNotification_success() throws Exception {
        DepositRequestDTO requestDTO = new DepositRequestDTO(BILL_ID, AMOUNT, EMAIL);
        NotificationResponseDTO responseDTO = new NotificationResponseDTO(EMAIL, "Notification sent successfully");

        when(notificationService.sendDepositNotification(any(DepositRequestDTO.class)))
                .thenReturn(responseDTO);

        mockMvc.perform(post("/notifications/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.message").value("Notification sent successfully"));

        verify(notificationService).sendDepositNotification(any(DepositRequestDTO.class));
    }

    @Test
    @DisplayName("Should return 400 Bad Request when input validation fails")
    void sendDepositNotification_validationError() throws Exception {
        DepositRequestDTO invalidDto = new DepositRequestDTO(null, null, "invalid-email");

        mockMvc.perform(post("/notifications/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists());

        verifyNoInteractions(notificationService);
    }
}