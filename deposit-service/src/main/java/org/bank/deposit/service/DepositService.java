package org.bank.deposit.service;

import lombok.RequiredArgsConstructor;
import org.bank.deposit.entity.Deposit;
import org.bank.deposit.handler.event.DepositEvent;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.deposit.repository.DepositRepository;
import org.bank.dto.response.DepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class DepositService {

    private final DepositRepository depositRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public DepositResponseDTO deposit(Long fromBillId, Long toBillId, BigDecimal amount, String email) {
        Deposit deposit = new Deposit(
                amount,
                toBillId,
                email,
                OffsetDateTime.now()
        );
        Deposit savedDeposit = depositRepository.save(deposit);
        return new DepositResponseDTO(savedDeposit.getAmount(), savedDeposit.getBillId(), savedDeposit.getEmail(), savedDeposit.getCreationDate());
    }

    public DepositResponseDTO getDeposit(Long depositId) {
        Deposit deposit = getDepositById(depositId);
        return new DepositResponseDTO(deposit.getAmount(), deposit.getBillId(),deposit.getEmail(), deposit.getCreationDate());
    }

    public Deposit getDepositById(Long depositId) {
        return depositRepository.findById(depositId).orElseThrow(
                () -> new NotFoundException("Could not find deposit with id: " + depositId)
        );
    }
}
