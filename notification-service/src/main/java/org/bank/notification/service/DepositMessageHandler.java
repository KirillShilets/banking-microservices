package org.bank.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.messaging.RabbitMQConstants;
import org.bank.notification.service.dto.DepositResponseDTO;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class DepositMessageHandler {

    private final JavaMailSender mailSender;

    @Autowired
    public DepositMessageHandler(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @RabbitListener(queues = RabbitMQConstants.DEPOSIT_QUEUE)
    public void receive(Message message) throws JsonProcessingException {
        System.out.println(message);
        byte[] body = message.getBody();
        String messageBody = new String(body);
        ObjectMapper objectMapper = new ObjectMapper();
        DepositResponseDTO depositResponseDTO = objectMapper.readValue(messageBody, DepositResponseDTO.class);
        System.out.println(depositResponseDTO);

        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setTo(depositResponseDTO.getMail());
        mailMessage.setFrom("shiletsk@mail.ru");

        mailMessage.setSubject("Deposit Notification");
        mailMessage.setText("Make deposit, sum: " + depositResponseDTO.getAmount());

        try {
            mailSender.send(mailMessage);
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
    }
}
