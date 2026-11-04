package org.bank.bill.service;

import lombok.RequiredArgsConstructor;
import org.bank.bill.entity.Bill;
import org.bank.bill.outbox.OutboxEventTypes;
import org.bank.bill.outbox.OutboxService;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.bank.validation.MoneyValidation;
import org.bank.dto.request.DepositRequestDTO;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * The transactional core of a sandbox deposit.
 *
 * <p>Exists as its own bean so the orchestrator can resolve the recipient and
 * check permissions — both of which may call account-service — without holding a
 * database transaction (and a {@code SELECT ... FOR UPDATE} lock) across that
 * call.
 */
@Component
@RequiredArgsConstructor
public class BillDepositExecutor {

    private final BillRepository billRepository;
    private final OutboxService outboxService;

    @Transactional
    public BillDepositResponseDTO applyDeposit(
            Long billId,
            BigDecimal amount,
            String recipient
    ) {
        Bill bill = billRepository.findByIdForUpdate(billId)
                .orElseThrow(() -> new NotFoundException(
                        "Bill not found with id: " + billId
                ));

        BigDecimal currentBalance = MoneyValidation.checkedBalance(bill.getAmount());
        BigDecimal newBalance = MoneyValidation.checkedBalance(
                currentBalance.add(amount)
        );

        bill.setAmount(newBalance);

        outboxService.saveEvent(
                OutboxEventTypes.AGGREGATE_BILL,
                billId.toString(),
                OutboxEventTypes.DEPOSIT_CREATED,
                new DepositRequestDTO(
                        billId,
                        amount,
                        recipient,
                        UUID.randomUUID()
                )
        );

        outboxService.saveEvent(
                OutboxEventTypes.AGGREGATE_BILL,
                billId.toString(),
                OutboxEventTypes.NOTIFICATION_CREATED,
                new DepositRequestDTO(
                        billId,
                        amount,
                        recipient,
                        UUID.randomUUID()
                )
        );

        return new BillDepositResponseDTO(
                bill.getBillId(),
                bill.getAccountId(),
                bill.getAmount(),
                recipient,
                bill.getIsDefault(),
                bill.getOverdraftEnabled(),
                bill.getCreationDate()
        );
    }
}
