package com.smartwallet;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartwallet.transactions.event.TransactionEventPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.profiles.active=integration",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration",
        "rate-limit.enabled=true",
        "rate-limit.capacity=2",
        "rate-limit.refill-minutes=1"
    })
@Import(RateLimitIntegrationTest.TestConfig.class)
class RateLimitIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16"))
      .withDatabaseName("smartwallet")
      .withUsername("smartwallet")
      .withPassword("smartwallet");

  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("security.jwt.secret", () -> "test-secret-at-least-32-characters-long-for-jwt");
    registry.add("smartwallet.receipts.upload-dir", () -> System.getProperty("java.io.tmpdir") + "/smartwallet-test-receipts");
  }

  @TestConfiguration
  static class TestConfig {
    @Bean
    TransactionEventPublisher transactionEventPublisher() {
      return event -> { /* no-op */ };
    }
  }

  @org.springframework.beans.factory.annotation.Autowired
  TestRestTemplate restTemplate;

  @Test
  void rateLimitReturns429WhenExceeded() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<String> request = new HttpEntity<>("{}", headers);

    ResponseEntity<String> r1 = restTemplate.postForEntity("/auth/login", request, String.class);
    ResponseEntity<String> r2 = restTemplate.postForEntity("/auth/login", request, String.class);
    ResponseEntity<String> r3 = restTemplate.postForEntity("/auth/login", request, String.class);

    assertThat(r1.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED);
    assertThat(r2.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED);
    assertThat(r3.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
  }

  @Test
  void healthExcludedFromRateLimit() {
    for (int i = 0; i < 5; i++) {
      ResponseEntity<String> res = restTemplate.getForEntity("/health", String.class);
      assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
  }
}
