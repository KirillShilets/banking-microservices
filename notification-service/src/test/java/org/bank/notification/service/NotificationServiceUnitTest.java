package org.bank.notification.service;

import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.exception.NotificationSendException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceUnitTest {

    private static final Long BILL_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final String CLIENT_EMAIL = "andrey@test.com";
    private static final String SENDER_EMAIL = "bank-robot@test.com";

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(notificationService, "senderEmail", SENDER_EMAIL);
    }

    @Test
    @DisplayName("Should send email successfully and return response DTO")
    void sendDepositNotification_success() {
        DepositRequestDTO requestDTO = new DepositRequestDTO(BILL_ID, AMOUNT, CLIENT_EMAIL);

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        doNothing().when(mailSender).send(messageCaptor.capture());

        NotificationResponseDTO response = notificationService.sendDepositNotification(requestDTO);

        assertNotNull(response);
        assertEquals(CLIENT_EMAIL, response.email());
        assertEquals("Notification sent successfully", response.message());

        SimpleMailMessage sentMessage = messageCaptor.getValue();
        assertEquals(SENDER_EMAIL, sentMessage.getFrom());
        assertEquals(CLIENT_EMAIL, Objects.requireNonNull(sentMessage.getTo())[0]);
        assertEquals("Deposit Notification", sentMessage.getSubject());
        assertTrue(Objects.requireNonNull(sentMessage.getText()).contains(AMOUNT.toString()));

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Should throw NotificationSendException when mail sender fails")
    void sendDepositNotification_failure() {
        DepositRequestDTO requestDTO = new DepositRequestDTO(BILL_ID, AMOUNT, CLIENT_EMAIL);

        doThrow(new MailSendException("SMTP error")).when(mailSender).send(any(SimpleMailMessage.class));

        assertThrows(
                NotificationSendException.class,
                () -> notificationService.sendDepositNotification(requestDTO)
        );

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
    }
}