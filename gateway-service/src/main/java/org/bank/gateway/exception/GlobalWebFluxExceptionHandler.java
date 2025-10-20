package org.bank.gateway.exception;

import lombok.extern.slf4j.Slf4j;
import org.bank.gateway.exception.dto.ErrorResponseDTO;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Slf4j
@Component
@Order(-2)
public class GlobalWebFluxExceptionHandler implements ErrorWebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = "Internal Server Error";

        if (ex instanceof ResponseStatusException rse) {
            if (rse.getStatusCode() instanceof HttpStatus httpStatus) {
                status = httpStatus;
            } else {
                status = HttpStatus.valueOf(rse.getStatusCode().value());
            }
            message = rse.getReason() != null ? rse.getReason() : status.getReasonPhrase();
        }

        ErrorResponseDTO response = new ErrorResponseDTO(
                message,
                status.value(),
                LocalDateTime.now()
        );
        log.warn("Gateway handled exception: {} [{}]", message, status.value(), ex);
        String json = """
                {
                  "message": "%s",
                  "status": %d,
                  "timestamp": "%s"
                }
                """.formatted(response.message(), response.status(), response.timestamp());

        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);

        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
}
