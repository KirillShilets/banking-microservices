package org.bank.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.exception.NotificationSendException;
import org.bank.notification.entity.DeliveryStatus;
import org.bank.notification.repository.NotificationDeliveryRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
public class NotificationServiceImpl implements NotificationService {

    private final JavaMailSender mailSender;
    private final NotificationDeliveryRepository deliveryRepository;
    private final TransactionTemplate requiresNewTx;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${notification.claim-timeout-minutes:5}")
    private long claimTimeoutMinutes = 5;

    public NotificationServiceImpl(
            JavaMailSender mailSender,
            NotificationDeliveryRepository deliveryRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.mailSender = mailSender;
        this.deliveryRepository = deliveryRepository;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public NotificationResponseDTO sendDepositNotification(DepositRequestDTO requestDTO) {
        if (requestDTO == null || requestDTO.messageId() == null) {
            throw new IllegalArgumentException("Notification message id is required");
        }

        UUID messageId = requestDTO.messageId();

        if (!claimDelivery(messageId)) {
            log.info("Message [{}] already claimed or sent. Skipping duplicate.", messageId);
            return new NotificationResponseDTO(requestDTO.email(), "Notification already sent");
        }

        log.info("Sending deposit notification to {}", requestDTO.email());

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(requestDTO.email());
        message.setFrom(senderEmail);
        message.setSubject("Deposit Notification");
        message.setText(String.format(
                "Your deposit was successful.\nAmount: %s",
                requestDTO.amount()
        ));

        try {
            mailSender.send(message);
            updateStatus(messageId, DeliveryStatus.SENT, OffsetDateTime.now());

            log.info("Successfully sent deposit notification to {}", requestDTO.email());
            return new NotificationResponseDTO(requestDTO.email(), "Notification sent successfully");
        } catch (Exception e) {
            log.error("Failed to send email for messageId {}. Marking as FAILED.", messageId, e);
            updateStatus(messageId, DeliveryStatus.FAILED, null);
            throw new NotificationSendException("Failed to send deposit notification");
        }
    }

    private boolean claimDelivery(UUID messageId) {
        try {
            return Boolean.TRUE.equals(requiresNewTx.execute(status -> {
                OffsetDateTime now = OffsetDateTime.now();
                return deliveryRepository.tryClaimDelivery(messageId, now) == 1
                        || deliveryRepository.reclaimDelivery(
                        messageId,
                        now.minusMinutes(claimTimeoutMinutes),
                        now
                ) == 1;
            }));
        } catch (DataIntegrityViolationException e) {
            return false;
        }
    }

    private void updateStatus(UUID messageId, DeliveryStatus status, OffsetDateTime sentAt) {
        try {
            requiresNewTx.executeWithoutResult(txStatus ->
                    deliveryRepository.updateStatus(messageId, status, sentAt)
            );
        } catch (Exception e) {
            log.error("Failed to update status to {} for messageId {}", status, messageId, e);
        }
    }
}