package org.bank.client;

import jakarta.validation.Valid;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient("notification-service")
@Retryable(
        value = {feign.FeignException.ServiceUnavailable.class},
        maxAttempts = 5,
        backoff = @Backoff(delay = 2000)
)
public interface NotificationServiceClient {
    @PostMapping("/notifications/deposits")
    NotificationResponseDTO sendDepositNotification(@Valid @RequestBody DepositRequestDTO requestDTO);
}
