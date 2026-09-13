package org.bank.notification.integration;

import org.bank.dto.request.DepositRequestDTO;
import org.bank.exception.NotificationSendException;
import org.bank.notification.repository.NotificationDeliveryRepository;
import org.bank.notification.service.NotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.mail.username=bank-robot@example.test"
)
class NotificationIntegrationTest {

    @Autowired
    private NotificationService service;

    @Autowired
    private NotificationDeliveryRepository repository;

    @MockitoBean
    private JavaMailSender mailSender;

    @AfterEach
    void clear() {
        repository.deleteAll();
    }

    private DepositRequestDTO request(UUID id) {
        return new DepositRequestDTO(
                1L,
                new BigDecimal("100.00"),
                "customer@example.test",
                id
        );
    }

    @Test
    void successfulSendPersistsMarker() {
        UUID id = UUID.randomUUID();

        service.sendDepositNotification(request(id));

        verify(mailSender).send(any(SimpleMailMessage.class));
        assertThat(repository.existsById(id)).isTrue();
    }

    @Test
    void sequentialDuplicateIsSkipped() {
        UUID id = UUID.randomUUID();
        DepositRequestDTO request = request(id);

        service.sendDepositNotification(request);
        service.sendDepositNotification(request);

        verify(mailSender, times(1))
                .send(any(SimpleMailMessage.class));

        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void smtpFailureDoesNotPersistMarker() {
        UUID id = UUID.randomUUID();

        doThrow(new MailSendException("Test SMTP failure"))
                .when(mailSender)
                .send(any(SimpleMailMessage.class));

        assertThrows(
                NotificationSendException.class,
                () -> service.sendDepositNotification(request(id))
        );

        assertThat(repository.existsById(id)).isFalse();
    }

    @Test
    void missingMessageIdIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> service.sendDepositNotification(request(null))
        );

        verifyNoInteractions(mailSender);
        assertThat(repository.count()).isZero();
    }
}