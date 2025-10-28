package org.bank.notification.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "mail")
public class MailProperties {
    private String host;
    private Integer port = 587;
    private String username;
    private String password;
    private boolean smtpAuth = true;
    private boolean starttlsEnable = true;
    private boolean debug = true;
    private String from;
}
