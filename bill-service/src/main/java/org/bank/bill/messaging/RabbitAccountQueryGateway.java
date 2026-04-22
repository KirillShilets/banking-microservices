package org.bank.bill.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.dto.response.AccountResponseDTO;
import org.bank.exception.BadRequestException;
import org.bank.exception.InternalServerException;
import org.bank.exception.NotFoundException;
import org.bank.messaging.RabbitTopology;
import org.bank.messaging.dto.AccountLookupRequestDTO;
import org.bank.messaging.dto.AccountLookupResponseDTO;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RabbitAccountQueryGateway implements AccountQueryGateway {

    private static final ParameterizedTypeReference<AccountLookupResponseDTO> ACCOUNT_LOOKUP_RESPONSE_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final RabbitTemplate rabbitTemplate;

    @Override
    public AccountResponseDTO getAccount(Long accountId) {
        try {
            AccountLookupResponseDTO lookupResponse = rabbitTemplate.convertSendAndReceiveAsType(
                    RabbitTopology.INTERNAL_EXCHANGE,
                    RabbitTopology.ACCOUNT_QUERY_ROUTING_KEY,
                    new AccountLookupRequestDTO(accountId),
                    ACCOUNT_LOOKUP_RESPONSE_TYPE
            );

            if (lookupResponse == null) {
                throw new InternalServerException("No response received from account-service");
            }

            if (!lookupResponse.isSuccess()) {
                String message = lookupResponse.errorMessage() != null
                        ? lookupResponse.errorMessage()
                        : "Failed to retrieve account with id: " + accountId;

                Integer statusCode = lookupResponse.statusCode();
                if (statusCode != null && statusCode == 400) {
                    throw new BadRequestException(message);
                }

                if (statusCode != null && statusCode == 404) {
                    throw new NotFoundException(message);
                }

                throw new InternalServerException(message);
            }

            return lookupResponse.account();
        } catch (AmqpException ex) {
            log.error("Failed to query account-service via RabbitMQ for accountId={}", accountId, ex);
            throw new InternalServerException("Failed to query account-service");
        }
    }
}
