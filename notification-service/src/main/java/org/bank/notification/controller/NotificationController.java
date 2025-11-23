package org.bank.notification.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.notification.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/deposits")
    public ResponseEntity<NotificationResponseDTO> sendDepositNotification(
            @Valid @RequestBody DepositRequestDTO requestDTO) {
        return ResponseEntity.ok(notificationService.sendDepositNotification(requestDTO));
    }
}
