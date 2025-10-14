package org.bank.deposit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bank.exception.BadRequestException;
import org.bank.exception.InternalServerException;
import org.bank.exception.NotFoundException;
import org.bank.deposit.controller.dto.DepositResponseDTO;
import org.bank.deposit.entity.Deposit;
import org.bank.deposit.repository.DepositRepository;
import org.bank.deposit.rest.AccountServiceClient;
import org.bank.deposit.rest.BillServiceClient;
import org.bank.deposit.rest.dto.AccountResponseDTO;
import org.bank.deposit.rest.dto.BillRequestDTO;
import org.bank.deposit.rest.dto.BillResponseDTO;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
public class DepositService {

    private static final String DEPOSIT_EXCHANGE = "deposit.exchange";
    private static final String DEPOSIT_ROUTING_KEY = "deposit.routing.key";

    private final DepositRepository depositRepository;
    private final AccountServiceClient accountServiceClient;
    private final BillServiceClient billServiceClient;
    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public DepositService(DepositRepository depositRepository, AccountServiceClient accountServiceClient,
                          BillServiceClient billServiceClient, RabbitTemplate rabbitTemplate) {
        this.depositRepository = depositRepository;
        this.accountServiceClient = accountServiceClient;
        this.billServiceClient = billServiceClient;
        this.rabbitTemplate = rabbitTemplate;
    }

    public DepositResponseDTO deposit(Long accountId, Long billId, BigDecimal amount) {
        if(accountId == null && billId == null) {
            throw new BadRequestException("Account ID and Bill ID cannot be null");
        }

        if(billId != null) {
            BillResponseDTO billResponseDTO = billServiceClient.getBillById(billId);
            BillRequestDTO billRequestDTO = createBillRequest(accountId, amount, billResponseDTO);

            billServiceClient.update(billId, billRequestDTO);

            AccountResponseDTO accountResponseDTO = accountServiceClient.getAccountById(billResponseDTO.getAccountId());
            depositRepository.save(new Deposit(amount, billId, OffsetDateTime.now(), accountResponseDTO.getEmail()));
            return createResponse(amount, accountResponseDTO);
        }
        BillResponseDTO defaultBill = getDefaultBill(accountId);
        BillRequestDTO billRequestDTO = createBillRequest(accountId, amount, defaultBill);
        billServiceClient.update(defaultBill.getBillId(), billRequestDTO);
        AccountResponseDTO account = accountServiceClient.getAccountById(defaultBill.getAccountId());
        depositRepository.save(new Deposit(amount, defaultBill.getBillId(), OffsetDateTime.now(), account.getEmail()));
        return createResponse(amount, account);
    }

    private DepositResponseDTO createResponse(BigDecimal amount, AccountResponseDTO accountResponseDTO) {
        DepositResponseDTO depositResponseDTO = new DepositResponseDTO(amount, accountResponseDTO.getEmail());
        ObjectMapper objectMapper = new ObjectMapper();

        try {
            rabbitTemplate.convertAndSend(DEPOSIT_EXCHANGE, DEPOSIT_ROUTING_KEY, objectMapper.writeValueAsString(depositResponseDTO));
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            throw new InternalServerException("Error while sending deposit to Rabbit");
        }

        return depositResponseDTO;
    }

    private static BillRequestDTO createBillRequest(Long accountId, BigDecimal amount, BillResponseDTO billResponseDTO) {
        BillRequestDTO billRequestDTO = new BillRequestDTO();
        billRequestDTO.setAccountId(accountId);
        billRequestDTO.setAmount(amount);
        billRequestDTO.setCreatedDate(billResponseDTO.getCreatedDate());
        billRequestDTO.setIsDefault(billResponseDTO.getIsDefault());
        billRequestDTO.setOverdraftEnabled(billResponseDTO.getOverdraftEnabled());
        billRequestDTO.setAmount(billResponseDTO.getAmount().add(amount));
        return billRequestDTO;
    }

    private BillResponseDTO getDefaultBill(Long accountId) {
        return billServiceClient.getBillsByAccountId(accountId).stream()
                .filter(BillResponseDTO::getIsDefault)
                .findAny()
                .orElseThrow(() -> new NotFoundException("Deposit not found"));
    }
}
