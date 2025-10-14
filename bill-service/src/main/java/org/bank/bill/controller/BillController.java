package org.bank.bill.controller;

import jakarta.validation.Valid;
import org.bank.bill.controller.dto.BillRequestDTO;
import org.bank.bill.controller.dto.BillResponseDTO;
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
        return new BillResponseDTO(billService.getBillById(billId));
    }

    @PostMapping()
    public Long createBill(@Valid @RequestBody BillRequestDTO billRequestDTO) {
        return billService.createBill(billRequestDTO.getAccountId(), billRequestDTO.getAmount(),
                billRequestDTO.getIsDefault(), billRequestDTO.getOverdraftEnabled());
    }

    @PutMapping("/{billId}")
    public BillResponseDTO updateBill(@PathVariable Long billId, @Valid @RequestBody BillRequestDTO billRequestDTO) {
        return new BillResponseDTO(billService.updateBill(billId,billRequestDTO.getAccountId(),
                billRequestDTO.getAmount(), billRequestDTO.getIsDefault(), billRequestDTO.getOverdraftEnabled()));
    }

    @DeleteMapping("/{billId}")
    public BillResponseDTO deleteBill(@PathVariable Long billId) {
        return new BillResponseDTO(billService.deleteBill(billId));
    }

    @GetMapping("/accounts/{accountId}")
    public List<BillResponseDTO> getBillsByAccountId(@PathVariable Long accountId) {
        return billService.getBillsByAccountId(accountId)
                .stream()
                .map(BillResponseDTO::new)
                .collect(Collectors.toList());
    }
}
