package org.bank.deposit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = {
        "org.bank.deposit",
        "org.bank.exception.handler"
})
@EnableDiscoveryClient
@EnableFeignClients(basePackages = "org.bank.client")
public class DepositApplication {
    public static void main(String[] args) {
        SpringApplication.run(DepositApplication.class, args);
    }
}
