package org.bank.deposit.service;

import org.bank.client.BillServiceClient;
import org.bank.deposit.entity.Deposit;
import org.bank.dto.BillDepositResponseDTO;
import org.bank.dto.DepositRequestDTO;
import org.bank.deposit.repository.DepositRepository;
import org.bank.dto.DepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class DepositService {

    private final DepositRepository depositRepository;
    private final BillServiceClient billServiceClient;

    @Autowired
    public DepositService(DepositRepository depositRepository, BillServiceClient billServiceClient) {
        this.depositRepository = depositRepository;
        this.billServiceClient = billServiceClient;
    }

    @Transactional
    public BillDepositResponseDTO deposit(Long billId, BigDecimal amount, String email) {
        try {
            BillDepositResponseDTO response = billServiceClient.depositBill(billId, new DepositRequestDTO(amount, email));
            Deposit deposit = new Deposit(
                    response.getAmount(),
                    response.getBillId(),
                    response.getEmail(),
                    response.getCreationDate()
            );
            depositRepository.save(deposit);
            return response;
        } catch (Exception e) {
            e.printStackTrace();
            throw new IllegalStateException("Could not create deposit");
        }
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
