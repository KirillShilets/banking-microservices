package org.bank.exception.handler;

import org.bank.exception.NotFoundException;
import org.bank.exception.ServiceException;
import org.bank.exception.dto.ErrorResponseDTO;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void setsAllowHeaderWhenSupportedMethodsArePresent() {
        HttpRequestMethodNotSupportedException ex =
                new HttpRequestMethodNotSupportedException("POST", List.of("GET", "PUT"));

        ResponseEntity<ErrorResponseDTO> response = handler.handleMethodNotSupported(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(response.getHeaders().getAllow()).containsExactly(HttpMethod.GET, HttpMethod.PUT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("HTTP method is not supported for this endpoint");
    }

    @Test
    void omitsAllowHeaderWhenSupportedMethodsAreNull() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST");

        ResponseEntity<ErrorResponseDTO> response = handler.handleMethodNotSupported(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(response.getHeaders().get(HttpHeaders.ALLOW)).isNull();
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void returnsErrorBodyForServiceException() {
        ServiceException ex = new NotFoundException("Nope");

        ResponseEntity<ErrorResponseDTO> response = handler.handleServiceException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("Nope");
    }
}
