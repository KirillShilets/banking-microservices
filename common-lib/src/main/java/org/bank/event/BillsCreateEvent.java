package org.bank.event;

import lombok.Data;
import org.bank.dto.CreateBillRequestDTO;

import java.util.List;
import java.util.UUID;

@Data
public class BillsCreateEvent {
    private UUID eventId;
    private Long accountId;
    private List<CreateBillRequestDTO> bills;

    public BillsCreateEvent(Long accountId, List<CreateBillRequestDTO> bills) {
        this.accountId = accountId;
        this.bills = bills;
    }

    public BillsCreateEvent() {}

    public UUID getEventId() {
        return eventId;
    }

    public Long getAccountId() {
        return accountId;
    }

    public List<CreateBillRequestDTO> getBills() {
        return bills;
    }
}

