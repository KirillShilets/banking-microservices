package org.bank.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.exception.NotificationSendException;
import org.bank.notification.entity.NotificationDelivery;
import org.bank.notification.repository.NotificationDeliveryRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final JavaMailSender mailSender;
    private final NotificationDeliveryRepository notificationDeliveryRepository;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Override
    @Transactional
    public NotificationResponseDTO sendDepositNotification(DepositRequestDTO requestDTO) {
        if (requestDTO == null || requestDTO.messageId() == null) {
            throw new IllegalArgumentException("Notification message id is required");
        }

        if (notificationDeliveryRepository.existsById(requestDTO.messageId())) {
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
            notificationDeliveryRepository.save(new NotificationDelivery(requestDTO.messageId()));
            log.info("Successfully sent deposit notification to {}", requestDTO.email());
            return new NotificationResponseDTO(requestDTO.email(), "Notification sent successfully");
        } catch (Exception e) {
            log.error("Failed to send deposit notification to {}", requestDTO.email(), e);
            throw new NotificationSendException("Failed to send deposit notification");
        }
    }
}
