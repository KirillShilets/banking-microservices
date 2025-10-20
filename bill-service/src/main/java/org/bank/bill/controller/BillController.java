package org.bank.bill.controller;

import jakarta.validation.Valid;
import org.bank.bill.entity.Bill;
import org.bank.dto.BillRequestDTO;
import org.bank.dto.BillResponseDTO;
import org.bank.bill.service.BillService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/bills")
public class BillController {

    private final BillService billService;

    @Autowired
    public BillController(BillService billService) {
        this.billService = billService;
    }

    @GetMapping("/{billId}")
    public BillResponseDTO getBill(@PathVariable Long billId) {
        Bill bill = billService.getBillById(billId);
        return new BillResponseDTO(bill.getBillId(), bill.getAccountId(), bill.getAmount(),
                bill.getIsDefault(), bill.getCreationDate(), bill.getOverdraftEnabled());
    }

    @PostMapping()
    public Long createBill(@Valid @RequestBody BillRequestDTO billRequestDTO) {
        return billService.createBill(billRequestDTO.getAccountId(), billRequestDTO.getAmount(),
                billRequestDTO.getIsDefault(), billRequestDTO.getOverdraftEnabled());
    }

    @PutMapping("/{billId}")
    public BillResponseDTO updateBill(@PathVariable Long billId, @Valid @RequestBody BillRequestDTO billRequestDTO) {
        Bill bill = billService.updateBill(billId,billRequestDTO.getAccountId(),
                billRequestDTO.getAmount(), billRequestDTO.getIsDefault(), billRequestDTO.getOverdraftEnabled());
        return new BillResponseDTO(bill.getBillId(), bill.getAccountId(), bill.getAmount(),
                bill.getIsDefault(), bill.getCreationDate(), bill.getOverdraftEnabled());
    }

    @DeleteMapping("/{billId}")
    public BillResponseDTO deleteBill(@PathVariable Long billId) {
        Bill bill = billService.deleteBill(billId);
        return new BillResponseDTO(bill.getBillId(), bill.getAccountId(), bill.getAmount(),
                bill.getIsDefault(), bill.getCreationDate(), bill.getOverdraftEnabled());
    }

    @GetMapping("/accounts/{accountId}")
    public List<BillResponseDTO> getBillsByAccountId(@PathVariable Long accountId) {
        return billService.getBillsByAccountId(accountId)
                .stream()
                .map(bill -> new BillResponseDTO(
                        bill.getBillId(),
                        bill.getAccountId(),
                        bill.getAmount(),
                        bill.getIsDefault(),
                        bill.getCreationDate(),
                        bill.getOverdraftEnabled()
                ))
                .collect(Collectors.toList());
    }

}
