package org.bank.deposit.service;

import org.bank.deposit.controller.dto.DepositResponseDTO;
import org.bank.deposit.entity.Deposit;
import org.bank.event.DepositCreateEvent;
import org.bank.deposit.messaging.DepositProducer;
import org.bank.deposit.repository.DepositRepository;
import org.bank.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
public class DepositService {

    private final DepositRepository depositRepository;
    private final DepositProducer depositProducer;

    public DepositService(DepositRepository depositRepository,
                          DepositProducer depositProducer) {
        this.depositRepository = depositRepository;
        this.depositProducer = depositProducer;
    }

    public DepositResponseDTO deposit(Long accountId, Long billId, BigDecimal amount) {
        if (accountId == null && billId == null) {
            throw new BadRequestException("Account ID and Bill ID cannot be null");
        }
        Deposit deposit = new Deposit(amount, billId, OffsetDateTime.now(), null);
        depositRepository.save(deposit);

        DepositCreateEvent event = new DepositCreateEvent(accountId, billId, amount);
        depositProducer.sendDepositCreatedEvent(event);

        return new DepositResponseDTO(amount, null);
    }
}
