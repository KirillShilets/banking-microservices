package org.bank.deposit.service;

import lombok.RequiredArgsConstructor;
import org.bank.deposit.entity.Deposit;
import org.bank.deposit.repository.DepositRepository;
import org.bank.dto.response.DepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class DepositServiceImpl implements DepositService {

    private final DepositRepository depositRepository;

    @Transactional
    public DepositResponseDTO saveDeposit(Long billId, BigDecimal amount, String email) {
        Deposit deposit = new Deposit(
                amount,
                billId,
                email,
                OffsetDateTime.now()
        );
        Deposit savedDeposit = depositRepository.save(deposit);
        return new DepositResponseDTO(savedDeposit.getBillId(), savedDeposit.getAmount(), savedDeposit.getEmail(), savedDeposit.getCreationDate());
    }

    @Transactional(readOnly = true)
    public DepositResponseDTO getDeposit(Long depositId) {
        Deposit deposit = getDepositById(depositId);
        return new DepositResponseDTO(deposit.getBillId(), deposit.getAmount(), deposit.getEmail(), deposit.getCreationDate());
    }

    private Deposit getDepositById(Long depositId) {
        return depositRepository.findById(depositId).orElseThrow(
                () -> new NotFoundException("Could not find deposit with id: " + depositId)
        );
    }
}
