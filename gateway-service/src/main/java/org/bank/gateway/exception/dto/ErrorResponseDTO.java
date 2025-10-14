package org.bank.gateway.exception.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record ErrorResponseDTO(@JsonProperty("message") String message,
                               @JsonProperty("status") int status,
                               @JsonProperty("timestamp")
                               @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime timestamp
) {}