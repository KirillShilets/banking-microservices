package org.bank.notification.controller;

import jakarta.validation.Valid;
import org.bank.dto.request.DepositRequestDTO;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @Autowired
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/deposits")
    public NotificationResponseDTO sendDepositNotification(
            @Valid @RequestBody DepositRequestDTO requestDTO) {
        return notificationService.sendDepositNotification(requestDTO);
    }
}
