package org.bank.notification.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.dto.request.DepositRequestDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.mail.username=bank-robot@test.com")
class NotificationIntegrationTest {

    private static final Long BILL_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final String CLIENT_EMAIL = "client@test.com";
    private static final String SENDER_EMAIL = "bank-robot@test.com";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JavaMailSender javaMailSender;

    @Test
    @DisplayName("Should process request, form email message and call MailSender")
    void sendDepositNotification_success() throws Exception {
        DepositRequestDTO requestDTO = new DepositRequestDTO(BILL_ID, AMOUNT, CLIENT_EMAIL);

        mockMvc.perform(post("/notifications/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(CLIENT_EMAIL))
                .andExpect(jsonPath("$.message").value("Notification sent successfully"));

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(javaMailSender, timeout(1000)).send(messageCaptor.capture());

        SimpleMailMessage sentMessage = messageCaptor.getValue();

        assertThat(sentMessage.getFrom()).isEqualTo(SENDER_EMAIL);
        assertThat(Objects.requireNonNull(sentMessage.getTo())[0]).isEqualTo(CLIENT_EMAIL);
        assertThat(sentMessage.getSubject()).isEqualTo("Deposit Notification");
        assertThat(sentMessage.getText()).contains(AMOUNT.toString());
    }

    @Test
    @DisplayName("Should return 500 Internal Server Error when MailSender fails")
    void sendDepositNotification_mailServerFailure() throws Exception {
        DepositRequestDTO requestDTO = new DepositRequestDTO(BILL_ID, AMOUNT, CLIENT_EMAIL);

        doThrow(new MailSendException("SMTP connection timeout"))
                .when(javaMailSender).send(any(SimpleMailMessage.class));

        mockMvc.perform(post("/notifications/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message", containsString("Failed to send deposit notification")));
    }

    @Test
    @DisplayName("Should return 400 Bad Request on invalid input")
    void sendDepositNotification_invalidInput() throws Exception {
        String invalidJson = """
            {
                "amount": "100.00",
                "email": "" 
            }
        """;

        mockMvc.perform(post("/notifications/deposits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());

        verify(javaMailSender, never()).send(any(SimpleMailMessage.class));
    }
}