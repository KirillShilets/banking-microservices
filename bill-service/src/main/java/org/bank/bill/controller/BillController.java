package org.bank.bill.controller;

import jakarta.validation.Valid;
import org.bank.bill.service.BillService;
import org.bank.dto.request.BillRequestDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return billService.getBillById(billId);
    }

    @PostMapping()
    public Long createBill(@Valid @RequestBody BillRequestDTO billRequestDTO) {
        return billService.createBill(billRequestDTO.getAccountId(), billRequestDTO.getAmount(),
                billRequestDTO.getIsDefault(), billRequestDTO.getOverdraftEnabled());
    }

    @PostMapping("/accounts/{accountId}")
    public List<Long> createBillsForAccount(@PathVariable Long accountId,
                                            @Valid @RequestBody List<CreateBillRequestDTO> bills) {
        return billService.createBillsForAccount(accountId, bills);
    }

    @PostMapping("/deposits/{billId}")
    public BillDepositResponseDTO depositBill(@PathVariable Long billId, @Valid @RequestBody DepositRequestDTO depositRequestDTO) {
        return billService.depositBill(billId, depositRequestDTO.getAmount());
    }

    @PutMapping("/{billId}")
    public BillResponseDTO updateBill(@PathVariable Long billId, @Valid @RequestBody BillRequestDTO billRequestDTO) {
        return billService.updateBill(billId, billRequestDTO.getAccountId(), billRequestDTO.getAmount(),
                billRequestDTO.getIsDefault(), billRequestDTO.getOverdraftEnabled());
    }

    @DeleteMapping("/{billId}")
    public BillResponseDTO deleteBill(@PathVariable Long billId) {
        return billService.deleteBill(billId);
    }

    @DeleteMapping("/accounts/{accountId}")
    public void deleteBillsByAccountId(@PathVariable Long accountId) {
        billService.deleteBillsByAccountId(accountId);
    }

    @GetMapping("/accounts/{accountId}")
    public List<BillResponseDTO> getBillsByAccountId(@PathVariable Long accountId) {
        return billService.getBillsByAccountId(accountId);
    }
}
