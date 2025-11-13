package org.bank.client;

import jakarta.validation.Valid;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.request.DepositRequestDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "bill-service")
public interface BillServiceClient {
    @PostMapping("/bills/accounts/{accountId}")
    @Retryable(
            value = {feign.FeignException.ServiceUnavailable.class},
            maxAttempts = 5,
            backoff = @Backoff(delay = 2000)
    )
    List<Long> createBillsForAccount(@PathVariable("accountId") Long accountId, @Valid @RequestBody List<CreateBillRequestDTO> bills);

    @PostMapping("/bills/deposits/{billId}")
    @Retryable(
            value = {feign.FeignException.ServiceUnavailable.class},
            maxAttempts = 5,
            backoff = @Backoff(delay = 2000)
    )
    BillDepositResponseDTO depositBill(@PathVariable("billId") Long billId, @Valid @RequestBody DepositRequestDTO depositRequestDTO);

    @GetMapping("/bills/accounts/{accountId}")
    @Retryable(
            value = {feign.FeignException.ServiceUnavailable.class},
            maxAttempts = 5,
            backoff = @Backoff(delay = 2000)
    )
    List<BillResponseDTO> getBillsByAccountId(@PathVariable("accountId") Long accountId);

    @DeleteMapping("/bills/{billId}")
    @Retryable(
            value = {feign.FeignException.ServiceUnavailable.class},
            maxAttempts = 5,
            backoff = @Backoff(delay = 2000)
    )
    BillResponseDTO getBill(@PathVariable("billId") Long billId);

    @PostMapping("/bills/{billId}")
    @Retryable(
            value = {feign.FeignException.ServiceUnavailable.class},
            maxAttempts = 5,
            backoff = @Backoff(delay = 2000)
    )
    void deleteBill(@PathVariable("billId") Long billId);

    @DeleteMapping("/bills/accounts/{accountId}")
    @Retryable(
            value = {feign.FeignException.ServiceUnavailable.class},
            maxAttempts = 5,
            backoff = @Backoff(delay = 2000)
    )
    void deleteBillsByAccountId(@PathVariable("accountId") Long accountId);
}
