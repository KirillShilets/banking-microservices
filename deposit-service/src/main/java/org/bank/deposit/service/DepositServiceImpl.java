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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepositServiceImpl implements DepositService {

    private final DepositRepository depositRepository;

    @Override
    @Transactional
    public DepositResponseDTO saveDeposit(Long billId, BigDecimal amount, String email, UUID messageId) {
        if (messageId == null) {
            throw new IllegalArgumentException("Message id is required");
        };

        BigDecimal normalizedAmount =
                org.bank.validation.MoneyValidation.positiveAmount(amount);

        Deposit existing = depositRepository.findByMessageId(messageId).orElse(null);
        if (existing != null) {
            return toResponse(existing);
        }
        Deposit deposit = new Deposit(
                normalizedAmount,
                billId,
                email,
                OffsetDateTime.now(),
                messageId
        );
        Deposit savedDeposit = depositRepository.save(deposit);
        return toResponse(savedDeposit);
    }

    @Override
    @Transactional(readOnly = true)
    public DepositResponseDTO getDeposit(Long depositId) {
        Deposit deposit = getDepositById(depositId);
        return toResponse(deposit);
    }

    private Deposit getDepositById(Long depositId) {
        return depositRepository.findById(depositId).orElseThrow(
                () -> new NotFoundException("Could not find deposit with id: " + depositId)
        );
    }

    private DepositResponseDTO toResponse(Deposit deposit) {
        return new DepositResponseDTO(
                deposit.getBillId(),
                deposit.getAmount(),
                deposit.getEmail(),
                deposit.getCreationDate()
        );
    }
}
