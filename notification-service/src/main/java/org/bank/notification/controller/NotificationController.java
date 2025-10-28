package org.bank.notification.controller;

import jakarta.validation.Valid;
import org.bank.dto.response.NotificationResponseDTO;
import org.bank.notification.controller.dto.DepositNotificationRequestDTO;
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
            @Valid @RequestBody DepositNotificationRequestDTO requestDTO) {
        return notificationService.sendDepositNotification(requestDTO);
    }
}
