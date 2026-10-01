package org.bank.notification.integration;

import org.bank.dto.request.DepositRequestDTO;
import org.bank.exception.NotificationSendException;
import org.bank.notification.entity.DeliveryStatus;
import org.bank.notification.entity.NotificationDelivery;
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
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
                "spring.mail.username=bank-robot@example.test",
                "notification.claim-timeout-minutes=5"
        }
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

    private void saveClaimed(UUID id, OffsetDateTime createdAt) {
        NotificationDelivery delivery = new NotificationDelivery(id, DeliveryStatus.CLAIMED);
        delivery.setCreatedAt(createdAt);
        repository.save(delivery);
    }

    @Test
    void successfulSendPersistsSentMarker() {
        UUID id = UUID.randomUUID();

        service.sendDepositNotification(request(id));

        verify(mailSender).send(any(SimpleMailMessage.class));

        NotificationDelivery delivery = repository.findById(id).orElseThrow();
        assertThat(delivery.getStatus()).isEqualTo(DeliveryStatus.SENT);
        assertThat(delivery.getSentAt()).isNotNull();
    }

    @Test
    void sequentialDuplicateIsSkipped() {
        UUID id = UUID.randomUUID();
        DepositRequestDTO request = request(id);

        service.sendDepositNotification(request);
        service.sendDepositNotification(request);

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void smtpFailureMarksDeliveryAsFailed() {
        UUID id = UUID.randomUUID();

        doThrow(new MailSendException("Test SMTP failure"))
                .when(mailSender)
                .send(any(SimpleMailMessage.class));

        assertThrows(
                NotificationSendException.class,
                () -> service.sendDepositNotification(request(id))
        );

        NotificationDelivery delivery = repository.findById(id).orElseThrow();
        assertThat(delivery.getStatus()).isEqualTo(DeliveryStatus.FAILED);
        assertThat(delivery.getSentAt()).isNull();
    }

    @Test
    void failedDeliveryIsRetriedAndMarkedAsSent() {
        UUID id = UUID.randomUUID();
        DepositRequestDTO request = request(id);

        doThrow(new MailSendException("Test SMTP failure"))
                .doNothing()
                .when(mailSender)
                .send(any(SimpleMailMessage.class));

        assertThrows(
                NotificationSendException.class,
                () -> service.sendDepositNotification(request)
        );
        assertThat(repository.findById(id).orElseThrow().getStatus())
                .isEqualTo(DeliveryStatus.FAILED);

        service.sendDepositNotification(request);

        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));

        NotificationDelivery delivery = repository.findById(id).orElseThrow();
        assertThat(delivery.getStatus()).isEqualTo(DeliveryStatus.SENT);
        assertThat(delivery.getSentAt()).isNotNull();
        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void staleClaimedDeliveryIsReclaimedAndMarkedAsSent() {
        UUID id = UUID.randomUUID();
        saveClaimed(id, OffsetDateTime.now().minusMinutes(10));

        service.sendDepositNotification(request(id));

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));

        NotificationDelivery delivery = repository.findById(id).orElseThrow();
        assertThat(delivery.getStatus()).isEqualTo(DeliveryStatus.SENT);
        assertThat(delivery.getSentAt()).isNotNull();
        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void freshClaimedDeliveryIsNotReclaimed() {
        UUID id = UUID.randomUUID();
        saveClaimed(id, OffsetDateTime.now());

        service.sendDepositNotification(request(id));

        verifyNoInteractions(mailSender);
        assertThat(repository.findById(id).orElseThrow().getStatus())
                .isEqualTo(DeliveryStatus.CLAIMED);
    }

    @Test
    void sentDeliveryIsNotReclaimed() {
        UUID id = UUID.randomUUID();
        DepositRequestDTO request = request(id);

        service.sendDepositNotification(request);
        service.sendDepositNotification(request);
        service.sendDepositNotification(request);

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
        assertThat(repository.findById(id).orElseThrow().getStatus())
                .isEqualTo(DeliveryStatus.SENT);
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