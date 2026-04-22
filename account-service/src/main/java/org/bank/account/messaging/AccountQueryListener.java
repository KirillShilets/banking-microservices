package org.bank.account.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.account.service.AccountService;
import org.bank.exception.NotFoundException;
import org.bank.messaging.RabbitTopology;
import org.bank.messaging.dto.AccountLookupRequestDTO;
import org.bank.messaging.dto.AccountLookupResponseDTO;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AccountQueryListener {

    private final AccountService accountService;

    @RabbitListener(queues = RabbitTopology.ACCOUNT_QUERY_QUEUE)
    public AccountLookupResponseDTO getAccount(AccountLookupRequestDTO request) {
        if (request == null || request.accountId() == null) {
            return AccountLookupResponseDTO.failure(HttpStatus.BAD_REQUEST, "Account id must be provided");
        }

        try {
            return AccountLookupResponseDTO.success(accountService.getAccount(request.accountId()));
        } catch (NotFoundException ex) {
            return AccountLookupResponseDTO.failure(HttpStatus.NOT_FOUND, ex.getMessage());
        } catch (RuntimeException ex) {
            log.error("Failed to process account lookup for accountId={}", request.accountId(), ex);
            return AccountLookupResponseDTO.failure(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to retrieve account information");
        }
    }
}
