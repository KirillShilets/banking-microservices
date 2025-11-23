package org.bank.bill.controller;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.bank.bill.service.BillService;
import org.bank.dto.request.BillRequestDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;

    @GetMapping("/{billId}")
    public ResponseEntity<BillResponseDTO> getBill(@PathVariable Long billId) {
        return ResponseEntity.ok(billService.getBill(billId));
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<List<BillResponseDTO>> getBillsByAccountId(@PathVariable Long accountId) {
        return ResponseEntity.ok(billService.getBillsByAccountId(accountId));
    }

    @PostMapping
    public ResponseEntity<Long> createBill(@Valid @RequestBody BillRequestDTO dto) {
        Long billId = billService.createBill(dto.accountId(), dto.amount(), dto.overdraftEnabled());
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequestUri()
                .path("/{id}")
                .buildAndExpand(billId)
                .toUri();

        return ResponseEntity.created(location).body(billId);
    }

    @PostMapping("/accounts/{accountId}")
    public ResponseEntity<List<Long>> createBillsForAccount(@PathVariable Long accountId,
                                            @Valid @RequestBody List<CreateBillRequestDTO> bills) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(billService.createBillsForAccount(accountId, bills));
    }

    @PutMapping("/{billId}")
    public ResponseEntity<BillResponseDTO> updateBill(@PathVariable Long billId, @Valid @RequestBody BillRequestDTO billRequestDTO) {
        return ResponseEntity.ok(billService.updateBill(billId, billRequestDTO.accountId(), billRequestDTO.amount(), billRequestDTO.overdraftEnabled()));
    }

    @PostMapping("/deposits")
    public ResponseEntity<BillDepositResponseDTO> depositBill(@Valid @RequestBody DepositRequestDTO dto) {
        return ResponseEntity.ok(billService.depositBill(dto.billId(), dto.amount(), dto.email()));
    }

    @DeleteMapping("/{billId}")
    public ResponseEntity<Void> deleteBill(@PathVariable Long billId) {
        billService.deleteBill(billId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/accounts/{accountId}")
    public ResponseEntity<Void> deleteBillsByAccountId(@PathVariable Long accountId) {
        billService.deleteBillsByAccountId(accountId);
        return ResponseEntity.noContent().build();
    }
}
