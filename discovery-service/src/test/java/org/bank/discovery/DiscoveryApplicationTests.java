package org.bank.discovery;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class DiscoveryApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private Environment environment;

    @Test
    @DisplayName("Application context should load Eureka Server beans")
    void contextLoads() {
        assertThat(applicationContext.containsBean("eurekaServerContext")).isTrue();
    }

    @Test
    @DisplayName("Health check should be UP and return JSON")
    void healthCheck() {
        ResponseEntity<String> entity = restTemplate.getForEntity("/actuator/health", String.class);

        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(entity.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Eureka Dashboard (UI) should be available at root")
    void eurekaDashboardLoads() {
        ResponseEntity<String> entity = restTemplate.getForEntity("/", String.class);

        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(entity.getBody()).contains("System Status");
    }

    @Test
    @DisplayName("Should run in standalone mode (no fetching/registering)")
    void checkStandaloneConfiguration() {
        Boolean register = environment.getProperty("eureka.client.register-with-eureka", Boolean.class);
        Boolean fetch = environment.getProperty("eureka.client.fetch-registry", Boolean.class);

        assertThat(register).isFalse();
        assertThat(fetch).isFalse();
    }
}