package org.bank.notification.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
@PropertySource("classpath:mail-props.properties")
public class MailConfig {

    private final MailProperties mailProperties;

    @Autowired
    public MailConfig(MailProperties mailProperties) {
        this.mailProperties = mailProperties;
    }

    @Bean
    public JavaMailSender getJavaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(mailProperties.getHost());
        mailSender.setPort(mailProperties.getPort());
        mailSender.setUsername(mailProperties.getUsername());
        mailSender.setPassword(mailProperties.getPassword());

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(mailProperties.isSmtpAuth()));
        props.put("mail.smtp.starttls.enable", String.valueOf(mailProperties.isStarttlsEnable()));
        props.put("mail.smtp.ssl.trust", String.valueOf(mailProperties.getHost()));
        props.put("mail.debug", String.valueOf(mailProperties.isDebug()));

        return mailSender;
    }
}
