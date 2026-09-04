package org.bank.gateway.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers.mockJwt;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class GatewayIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void unauthenticatedRequestIsUnauthorized() {
        webTestClient.get().uri("/non-existent-route-12345")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void authenticatedUnknownRouteIsNotFound() {
        webTestClient
                .mutateWith(mockJwt().jwt(jwt -> jwt
                        .subject("11111111-1111-1111-1111-111111111111")
                        .claim("realm_access", Map.of("roles", List.of("admin")))))
                .get().uri("/non-existent-route-12345")
                .exchange()
                .expectStatus().isNotFound()
                .expectHeader().contentType(MediaType.APPLICATION_JSON);
    }
}