package com.smartwallet.auth.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class JwtServiceTest {
  @Test
  void generatesAndValidatesToken() {
    JwtService jwtService =
        new JwtService("test-secret-test-secret-test-secret-123456", 3600);

    String token = jwtService.generateToken("user@example.com");

    assertTrue(jwtService.isTokenValid(token));
    assertEquals("user@example.com", jwtService.extractSubject(token));
  }
}
