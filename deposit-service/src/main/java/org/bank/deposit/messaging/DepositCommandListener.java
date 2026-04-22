package org.bank.deposit.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bank.deposit.service.DepositService;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.messaging.RabbitTopology;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DepositCommandListener {

    private final DepositService depositService;

    @RabbitListener(queues = RabbitTopology.DEPOSIT_SAVE_QUEUE)
    public void handleDepositCommand(DepositRequestDTO request) {
        if (request == null || request.billId() == null || request.amount() == null || request.email() == null) {
            log.warn("Skipped invalid deposit command payload");
            return;
        }

        try {
            depositService.saveDeposit(request.billId(), request.amount(), request.email());
        } catch (RuntimeException ex) {
            log.error("Failed to persist deposit command for billId={}", request.billId(), ex);
        }
    }
}
