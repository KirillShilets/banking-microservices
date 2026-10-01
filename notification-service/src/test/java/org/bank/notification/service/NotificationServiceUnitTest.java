package org.bank.notification.service;

import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.exception.NotificationSendException;
import org.bank.notification.entity.DeliveryStatus;
import org.bank.notification.repository.NotificationDeliveryRepository;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceUnitTest {

    private static final Long BILL_ID = 1L;
    private static final BigDecimal AMOUNT = new BigDecimal("100.00");
    private static final String CLIENT_EMAIL = "andrey@test.com";
    private static final String SENDER_EMAIL = "bank-robot@test.com";

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private NotificationDeliveryRepository notificationDeliveryRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Mock
    private TransactionStatus transactionStatus;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(notificationService, "senderEmail", SENDER_EMAIL);
        when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);
    }

    private DepositRequestDTO request() {
        return new DepositRequestDTO(BILL_ID, AMOUNT, CLIENT_EMAIL, UUID.randomUUID());
    }

    @Test
    @DisplayName("Should send email successfully and return response DTO")
    void sendDepositNotification_success() {
        DepositRequestDTO request = request();

        when(notificationDeliveryRepository.tryClaimDelivery(eq(request.messageId()), any()))
                .thenReturn(1);

        ArgumentCaptor<SimpleMailMessage> messageCaptor =
                ArgumentCaptor.forClass(SimpleMailMessage.class);
        doNothing().when(mailSender).send(messageCaptor.capture());

        NotificationResponseDTO response = notificationService.sendDepositNotification(request);

        assertNotNull(response);
        assertEquals(CLIENT_EMAIL, response.email());
        assertEquals("Notification sent successfully", response.message());

        SimpleMailMessage sent = messageCaptor.getValue();
        assertEquals(SENDER_EMAIL, sent.getFrom());
        assertEquals(CLIENT_EMAIL, Objects.requireNonNull(sent.getTo())[0]);
        assertEquals("Deposit Notification", sent.getSubject());
        assertTrue(Objects.requireNonNull(sent.getText()).contains(AMOUNT.toString()));

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
        verify(notificationDeliveryRepository).updateStatus(
                eq(request.messageId()), eq(DeliveryStatus.SENT), any(OffsetDateTime.class));
        verify(notificationDeliveryRepository, never()).reclaimDelivery(any(), any(), any());
    }

    @Test
    @DisplayName("Should throw NotificationSendException when mail sender fails")
    void sendDepositNotification_failure() {
        DepositRequestDTO request = request();

        when(notificationDeliveryRepository.tryClaimDelivery(eq(request.messageId()), any()))
                .thenReturn(1);
        doThrow(new MailSendException("SMTP error"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        assertThrows(
                NotificationSendException.class,
                () -> notificationService.sendDepositNotification(request)
        );

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
        verify(notificationDeliveryRepository).updateStatus(
                eq(request.messageId()), eq(DeliveryStatus.FAILED), isNull());
    }

    @Test
    @DisplayName("Should skip duplicate message without sending email")
    void sendDepositNotification_duplicateSkipped() {
        DepositRequestDTO request = request();

        when(notificationDeliveryRepository.tryClaimDelivery(eq(request.messageId()), any()))
                .thenReturn(0);
        when(notificationDeliveryRepository.reclaimDelivery(eq(request.messageId()), any(), any()))
                .thenReturn(0);

        NotificationResponseDTO response = notificationService.sendDepositNotification(request);

        assertEquals("Notification already sent", response.message());
        verifyNoInteractions(mailSender);
        verify(notificationDeliveryRepository, never()).updateStatus(any(), any(), any());
    }

    @Test
    @DisplayName("Should reclaim failed or stale delivery and send email again")
    void sendDepositNotification_reclaimedDeliverySent() {
        DepositRequestDTO request = request();

        when(notificationDeliveryRepository.tryClaimDelivery(eq(request.messageId()), any()))
                .thenReturn(0);
        when(notificationDeliveryRepository.reclaimDelivery(eq(request.messageId()), any(), any()))
                .thenReturn(1);

        NotificationResponseDTO response = notificationService.sendDepositNotification(request);

        assertEquals("Notification sent successfully", response.message());
        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
        verify(notificationDeliveryRepository).updateStatus(
                eq(request.messageId()), eq(DeliveryStatus.SENT), any(OffsetDateTime.class));
    }

    @Test
    @DisplayName("Should use configured claim timeout as stale threshold")
    void sendDepositNotification_usesClaimTimeout() {
        DepositRequestDTO request = request();
        ReflectionTestUtils.setField(notificationService, "claimTimeoutMinutes", 7L);

        when(notificationDeliveryRepository.tryClaimDelivery(eq(request.messageId()), any()))
                .thenReturn(0);
        when(notificationDeliveryRepository.reclaimDelivery(eq(request.messageId()), any(), any()))
                .thenReturn(0);

        notificationService.sendDepositNotification(request);

        ArgumentCaptor<OffsetDateTime> staleCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
        ArgumentCaptor<OffsetDateTime> reclaimedCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);

        verify(notificationDeliveryRepository).reclaimDelivery(
                eq(request.messageId()), staleCaptor.capture(), reclaimedCaptor.capture());

        assertEquals(reclaimedCaptor.getValue().minusMinutes(7), staleCaptor.getValue());
    }
}