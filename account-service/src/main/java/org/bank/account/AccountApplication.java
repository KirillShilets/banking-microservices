package org.bank.account;

import org.bank.messaging.config.RabbitMessagingConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = {
        "org.bank.account",
        "org.bank.exception.handler"
})
@EnableDiscoveryClient
@EnableAsync
@Import(RabbitMessagingConfiguration.class)
public class AccountApplication {
    public static void main(String[] args) {
        SpringApplication.run(AccountApplication.class, args);
    }
}
