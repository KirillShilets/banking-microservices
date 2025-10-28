package org.bank.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.exception.NotificationSendException;
import org.bank.notification.config.MailProperties;
import org.bank.notification.controller.dto.DepositNotificationRequestDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class NotificationServiceImpl implements NotificationService {

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    @Autowired
    public NotificationServiceImpl(JavaMailSender mailSender,MailProperties mailProperties) {
        this.mailSender = mailSender;
        this.mailProperties = mailProperties;
    }


    @Override
    public NotificationResponseDTO sendDepositNotification(DepositNotificationRequestDTO requestDTO) {
        log.info("Sending deposit notification to {}", requestDTO.getMail());
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(requestDTO.getMail());
        message.setFrom(mailProperties.getFrom());
        message.setSubject("Deposit Notification");
        message.setText(String.format(
                "Your deposit was successful.\nAmount: %s",
                requestDTO.getAmount()
        ));

        try {
            mailSender.send(message);
            log.info("Successfully sent deposit notification to {}", requestDTO.getMail());
            return new NotificationResponseDTO(requestDTO.getMail(), "Notification sent successfully");
        } catch (Exception e) {
            log.error("Failed to send deposit notification to {}", requestDTO.getMail(), e);
            throw new NotificationSendException("Failed to send deposit notification");
        }
    }
}
