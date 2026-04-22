package org.bank.deposit;

import org.bank.messaging.config.RabbitMessagingConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Import;

@SpringBootApplication(scanBasePackages = {
        "org.bank.deposit",
        "org.bank.exception.handler"
})
@EnableDiscoveryClient
@Import(RabbitMessagingConfiguration.class)
public class DepositApplication {
    public static void main(String[] args) {
        SpringApplication.run(DepositApplication.class, args);
    }
}
