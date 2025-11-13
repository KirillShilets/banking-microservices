package org.bank.notification.service.handler;

import lombok.extern.slf4j.Slf4j;
import org.bank.notification.service.dto.DepositResponseDTO;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class DepositMessageHandler {

    private final JavaMailSender mailSender;

    public DepositMessageHandler(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendDepositMail(DepositResponseDTO depositResponseDTO) {
        log.info("Preparing to send deposit notification email to {}", depositResponseDTO.email());

        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setTo(depositResponseDTO.email());
        mailMessage.setFrom("checkmailbanksystem@gmail.com");
        mailMessage.setSubject("Deposit Notification");
        mailMessage.setText("Your deposit was successful. Amount: " + depositResponseDTO.amount());

        try {
            mailSender.send(mailMessage);
            log.info("Deposit notification sent successfully to {}", depositResponseDTO.email());
        } catch (Exception e) {
            log.error("Failed to send deposit notification to {}: {}", depositResponseDTO.email(), e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
