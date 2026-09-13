package org.bank.bill.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.bank.bill.controller.dto.request.SandboxDepositRequest;
import org.bank.bill.service.BillService;
import org.bank.dto.request.BillRequestDTO;
import org.bank.dto.request.CreateBillRequestDTO;
import org.bank.dto.response.BillDepositResponseDTO;
import org.bank.dto.response.BillResponseDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/bills")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('customer', 'employee', 'admin')")
public class BillController {

    private final BillService billService;

    @GetMapping("/{billId}")
    public ResponseEntity<BillResponseDTO> getBill(@PathVariable Long billId) {
        return ResponseEntity.ok(billService.getBill(billId));
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<List<BillResponseDTO>> getBillsByAccountId(@PathVariable Long accountId) {
        return ResponseEntity.ok(
                billService.getBillsByAccountId(accountId)
        );
    }

    @PostMapping
    public ResponseEntity<Long> createBill(@Valid @RequestBody BillRequestDTO request) {
        Long billId = billService.createBill(
                request.accountId(),
                request.amount(),
                request.overdraftEnabled()
        );

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequestUri()
                .path("/{id}")
                .buildAndExpand(billId)
                .toUri();

        return ResponseEntity.created(location).body(billId);
    }

    @PostMapping("/accounts/{accountId}")
    public ResponseEntity<List<Long>> createBillsForAccount(@PathVariable Long accountId, @RequestBody List<CreateBillRequestDTO> bills) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        billService.createBillsForAccount(
                                accountId,
                                bills
                        )
                );
    }

    @PostMapping("/sandbox/deposits")
    @PreAuthorize("hasAnyRole('employee', 'admin')")
    public ResponseEntity<BillDepositResponseDTO> depositBill(@Valid @RequestBody SandboxDepositRequest request) {
        return ResponseEntity.ok(
                billService.depositBill(
                        request.billId(),
                        request.amount()
                )
        );
    }
}