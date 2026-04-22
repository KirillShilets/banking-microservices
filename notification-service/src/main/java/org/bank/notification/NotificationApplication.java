package org.bank.notification;

import org.bank.messaging.config.RabbitMessagingConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Import;

@SpringBootApplication(scanBasePackages = {
        "org.bank.notification",
        "org.bank.exception.handler"
})
@EnableDiscoveryClient
@Import(RabbitMessagingConfiguration.class)
public class NotificationApplication {
    public static void main(String[] args) {
        SpringApplication.run(NotificationApplication.class, args);
    }
}
