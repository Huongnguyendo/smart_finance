package com.smartwallet.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Fails fast on startup when the {@code prod} profile is active and critical secrets are unsafe.
 */
@Component
@Profile("prod")
public class ProductionReadinessConfig implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(ProductionReadinessConfig.class);

  @Value("${security.jwt.secret}")
  private String jwtSecret;

  @Override
  public void run(ApplicationArguments args) {
    if (jwtSecret == null || jwtSecret.length() < 32) {
      throw new IllegalStateException(
          "Production requires security.jwt.secret (or JWT_SECRET) with at least 32 characters.");
    }
    if (jwtSecret.contains("change-me")) {
      throw new IllegalStateException(
          "Production cannot use the default JWT secret. Set JWT_SECRET to a strong random value.");
    }
    log.info("Production readiness checks passed (JWT secret configured).");
  }
}
