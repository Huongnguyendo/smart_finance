package com.smartwallet;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartwallet.transactions.event.TransactionEventPublisher;
import java.util.UUID;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
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
        "rate-limit.enabled=false"
    })
@Import(ApiGatewayIntegrationTest.TestConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiGatewayIntegrationTest {

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
      return event -> { /* no-op for integration tests */ };
    }
  }

  @Autowired
  TestRestTemplate restTemplate;

  @Autowired
  ObjectMapper objectMapper;

  @Autowired
  JdbcTemplate jdbcTemplate;

  @Test
  @Order(1)
  void healthReturnsOk() {
    ResponseEntity<String> res = restTemplate.getForEntity("/health", String.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  @Order(2)
  void registerLoginAndListTransactions() throws Exception {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    String email = "tx-" + suffix + "@example.com";
    // Register
    String registerBody = String.format(
        """
        {"email":"%s","password":"secret123","displayName":"Test User"}
        """,
        email);
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> registerRes = restTemplate.postForEntity(
        "/auth/register",
        new HttpEntity<>(registerBody, headers),
        String.class);
    assertThat(registerRes.getStatusCode()).isEqualTo(HttpStatus.OK);

    // Login (use login token for API calls — same as typical client flow)
    String loginBody = String.format(
        """
        {"email":"%s","password":"secret123"}
        """,
        email);
    ResponseEntity<String> loginRes = restTemplate.postForEntity(
        "/auth/login",
        new HttpEntity<>(loginBody, headers),
        String.class);
    assertThat(loginRes.getStatusCode()).isEqualTo(HttpStatus.OK);
    String token = objectMapper.readTree(loginRes.getBody()).get("token").asText();

    // List transactions (authenticated)
    HttpHeaders authHeaders = new HttpHeaders();
    authHeaders.setBearerAuth(token);
    authHeaders.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
    ResponseEntity<String> txRes = restTemplate.exchange(
        "/api/transactions",
        org.springframework.http.HttpMethod.GET,
        new HttpEntity<>(authHeaders),
        String.class);
    assertThat(txRes.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(txRes.getBody())
        .as("transaction list response body")
        .contains("\"content\"");
    JsonNode txJson = objectMapper.readTree(txRes.getBody());
    assertThat(txJson.has("content")).isTrue();
    assertThat(txJson.get("content").isArray()).isTrue();
    assertThat(txJson.get("content").isEmpty()).isTrue();
  }

  @Test
  @Order(3)
  void adminOverviewForbiddenForRegularUser() throws Exception {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    String email = "plain-" + suffix + "@example.com";
    String registerBody = String.format(
        """
        {"email":"%s","password":"secret123","displayName":"Plain"}
        """,
        email);
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> regRes = restTemplate.postForEntity(
        "/auth/register", new HttpEntity<>(registerBody, headers), String.class);
    assertThat(regRes.getStatusCode()).isEqualTo(HttpStatus.OK);
    String token = objectMapper.readTree(regRes.getBody()).get("token").asText();

    HttpHeaders authHeaders = new HttpHeaders();
    authHeaders.setBearerAuth(token);
    ResponseEntity<String> adminRes = restTemplate.exchange(
        "/api/admin/overview",
        org.springframework.http.HttpMethod.GET,
        new HttpEntity<>(authHeaders),
        String.class);
    assertThat(adminRes.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  @Order(4)
  void adminOverviewOkForAdminUser() throws Exception {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    String email = "superadmin-" + suffix + "@example.com";
    String registerBody = String.format(
        """
        {"email":"%s","password":"secret123","displayName":"Admin"}
        """,
        email);
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> regRes = restTemplate.postForEntity(
        "/auth/register", new HttpEntity<>(registerBody, headers), String.class);
    assertThat(regRes.getStatusCode()).isEqualTo(HttpStatus.OK);

    // JDBC ensures the role is committed and visible to the servlet thread (HTTP pool).
    int updated = jdbcTemplate.update("UPDATE users SET role = ? WHERE email = ?", "ADMIN", email);
    assertThat(updated).isEqualTo(1);

    String token = objectMapper.readTree(regRes.getBody()).get("token").asText();
    HttpHeaders authHeaders = new HttpHeaders();
    authHeaders.setBearerAuth(token);
    ResponseEntity<String> adminRes = restTemplate.exchange(
        "/api/admin/overview",
        org.springframework.http.HttpMethod.GET,
        new HttpEntity<>(authHeaders),
        String.class);
    assertThat(adminRes.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode overview = objectMapper.readTree(adminRes.getBody());
    assertThat(overview.get("userCount").asLong()).isGreaterThanOrEqualTo(1);
    assertThat(overview.get("transactionCount").asLong()).isGreaterThanOrEqualTo(0);
    assertThat(overview.get("budgetCount").asLong()).isGreaterThanOrEqualTo(0);
  }

  @Test
  @Order(5)
  void unauthenticatedRequestToProtectedEndpointReturns401Or403() {
    ResponseEntity<String> res = restTemplate.getForEntity("/api/transactions", String.class);
    assertThat(res.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
  }

  @Test
  @Order(6)
  void unauthenticatedReceiptUploadReturns401Or403() {
    org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
    body.add("file", new org.springframework.core.io.ByteArrayResource(new byte[0]) {
      @Override
      public String getFilename() {
        return "test.jpg";
      }
    });
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.MULTIPART_FORM_DATA);
    ResponseEntity<String> res = restTemplate.postForEntity(
        "/api/transactions/upload-receipt",
        new HttpEntity<>(body, headers),
        String.class);
    assertThat(res.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
  }

  @Test
  @Order(7)
  void registerFailsWhenEmailExists() {
    String dupEmail = "dup-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    String body = String.format(
        """
        {"email":"%s","password":"secret123","displayName":"Dup User"}
        """,
        dupEmail);
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    restTemplate.postForEntity("/auth/register", new HttpEntity<>(body, headers), String.class);

    ResponseEntity<String> res = restTemplate.postForEntity(
        "/auth/register",
        new HttpEntity<>(body, headers),
        String.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  @Order(8)
  void budgetsCrud() throws Exception {
    String budgetEmail = "budget-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    String registerBody = String.format(
        """
        {"email":"%s","password":"secret123","displayName":"Budget User"}
        """,
        budgetEmail);
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> regRes = restTemplate.postForEntity(
        "/auth/register", new HttpEntity<>(registerBody, headers), String.class);
    assertThat(regRes.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode regJson = objectMapper.readTree(regRes.getBody());
    String token = regJson.get("token").asText();
    long userId = regJson.get("user").get("id").asLong();

    HttpHeaders authHeaders = new HttpHeaders();
    authHeaders.setContentType(MediaType.APPLICATION_JSON);
    authHeaders.setBearerAuth(token);

    // List (empty)
    ResponseEntity<String> listRes = restTemplate.exchange(
        "/api/budgets",
        org.springframework.http.HttpMethod.GET,
        new HttpEntity<>(authHeaders),
        String.class);
    assertThat(listRes.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(listRes.getBody()).isEqualTo("[]");

    // Create
    String createBody = String.format(
        "{\"userId\":%d,\"categoryName\":\"Food\",\"limitAmount\":300}", userId);
    ResponseEntity<String> createRes = restTemplate.exchange(
        "/api/budgets",
        org.springframework.http.HttpMethod.POST,
        new HttpEntity<>(createBody, authHeaders),
        String.class);
    assertThat(createRes.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode budget = objectMapper.readTree(createRes.getBody());
    long id = budget.get("id").asLong();
    assertThat(budget.get("categoryName").asText()).isEqualTo("Food");
    assertThat(budget.get("limitAmount").asDouble()).isEqualTo(300);

    // Update
    String updateBody = String.format("{\"userId\":%d,\"limitAmount\":400}", userId);
    ResponseEntity<String> updateRes = restTemplate.exchange(
        "/api/budgets/" + id,
        org.springframework.http.HttpMethod.PUT,
        new HttpEntity<>(updateBody, authHeaders),
        String.class);
    assertThat(updateRes.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(objectMapper.readTree(updateRes.getBody()).get("limitAmount").asDouble()).isEqualTo(400);

    // Delete
    ResponseEntity<String> deleteRes = restTemplate.exchange(
        "/api/budgets/" + id,
        org.springframework.http.HttpMethod.DELETE,
        new HttpEntity<>(authHeaders),
        String.class);
    assertThat(deleteRes.getStatusCode()).isEqualTo(HttpStatus.OK);
  }
}
