package org.bank.client.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Response;
import feign.codec.ErrorDecoder;
import org.bank.exception.BadRequestException;
import org.bank.exception.InternalServerException;
import org.bank.exception.NotFoundException;
import org.bank.exception.dto.ErrorResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class FeignErrorDecoder implements ErrorDecoder {

    private static final Logger log = LoggerFactory.getLogger(FeignErrorDecoder.class);
    private final ObjectMapper objectMapper;
    private final ErrorDecoder defaultDecoder = new Default();

    public FeignErrorDecoder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        String responseBody = extractBody(response);

        ErrorResponseDTO errorDTO = parseErrorDTO(responseBody);

        if (errorDTO == null || errorDTO.message() == null) {
            log.warn("Could not parse error response body or body is empty. Falling back to default decoder. MethodKey: {}, Response: {}", methodKey, responseBody);
            return defaultDecoder.decode(methodKey, response);
        }

        HttpStatus status = HttpStatus.valueOf(response.status());
        String message = errorDTO.message();

        return switch (status) {
            case NOT_FOUND -> new NotFoundException(message);
            case BAD_REQUEST -> new BadRequestException(message);
            default -> new InternalServerException(message);
        };
    }

    private String extractBody(Response response) {
        if (response.body() == null) {
            return null;
        }
        try (InputStream bodyStream = response.body().asInputStream()) {
            return new String(bodyStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }

    private ErrorResponseDTO parseErrorDTO(String json) {
        if (json == null || json.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, ErrorResponseDTO.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}