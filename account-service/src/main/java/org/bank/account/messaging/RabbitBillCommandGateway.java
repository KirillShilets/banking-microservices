package org.bank.account.messaging;

import lombok.RequiredArgsConstructor;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.messaging.RabbitTopology;
import org.bank.messaging.dto.CreateBillsCommandDTO;
import org.bank.messaging.dto.DeleteBillsByAccountCommandDTO;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class RabbitBillCommandGateway implements BillCommandGateway {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void createBillsForAccount(Long accountId, List<CreateBillRequestDTO> bills) {
        rabbitTemplate.convertAndSend(
                RabbitTopology.INTERNAL_EXCHANGE,
                RabbitTopology.BILL_CREATE_FOR_ACCOUNT_ROUTING_KEY,
                new CreateBillsCommandDTO(accountId, bills)
        );
    }

    @Override
    public void deleteBillsByAccountId(Long accountId) {
        rabbitTemplate.convertAndSend(
                RabbitTopology.INTERNAL_EXCHANGE,
                RabbitTopology.BILL_DELETE_BY_ACCOUNT_ROUTING_KEY,
                new DeleteBillsByAccountCommandDTO(accountId)
        );
    }
}
