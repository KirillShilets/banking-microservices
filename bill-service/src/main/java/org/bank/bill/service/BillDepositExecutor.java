package org.bank.bill.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.bank.bill.entity.Bill;
import org.bank.bill.idempotency.IdempotencyKeyRepository;
import org.bank.bill.outbox.OutboxEventTypes;
import org.bank.bill.outbox.OutboxService;
import org.bank.bill.repository.BillRepository;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.exception.NotFoundException;
import org.bank.validation.MoneyValidation;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * The transactional core of a sandbox deposit.
 *
 * <p>Exists as its own bean so the orchestrator can resolve the recipient and
 * check permissions — both of which may call account-service — without holding a
 * database transaction (and a {@code SELECT ... FOR UPDATE} lock) across that
 * call.
 *
 * <p>The idempotency key is completed here, inside the same transaction that
 * moves the money, so "balance changed" and "this key is done" cannot disagree.
 */
@Component
@RequiredArgsConstructor
public class BillDepositExecutor {

    private final BillRepository billRepository;
    private final OutboxService outboxService;
    private final IdempotencyKeyRepository idempotencyKeyRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public BillDepositResponseDTO applyDeposit(
            String idempotencyKey,
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

        BillDepositResponseDTO response = new BillDepositResponseDTO(
                bill.getBillId(),
                bill.getAccountId(),
                bill.getAmount(),
                recipient,
                bill.getIsDefault(),
                bill.getOverdraftEnabled(),
                bill.getCreationDate()
        );

        completeIdempotencyKey(idempotencyKey, response);

        return response;
    }

    private void completeIdempotencyKey(
            String idempotencyKey,
            BillDepositResponseDTO response
    ) {
        try {
            idempotencyKeyRepository.complete(
                    idempotencyKey,
                    objectMapper.writeValueAsString(response),
                    OffsetDateTime.now()
            );
        } catch (JsonProcessingException exception) {
            // Rolling back is the right outcome: the key must not be marked done
            // for a deposit whose response could not be stored.
            throw new IllegalStateException(
                    "Cannot store the response for idempotency key " + idempotencyKey,
                    exception
            );
        }
    }
}
