package com.smartwallet;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class SmartWalletApplication {
  private static final Logger log = LoggerFactory.getLogger(SmartWalletApplication.class);
  private static final Pattern ENV_LINE = Pattern.compile("^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)$");

  public static void main(String[] args) {
    loadEnv();
    applyRabbitMqDisableFromEnvironment();
    List<String> allArgs = new ArrayList<>(Arrays.asList(args));
    if (isRabbitMqDisabledByEnvironment()) {
      // Hard exclude so no AMQP beans/listeners start (Render without a broker).
      // Include UserDetailsServiceAutoConfiguration so we keep the same excludes as @SpringBootApplication.
      allArgs.add(
          "--spring.autoconfigure.exclude="
              + UserDetailsServiceAutoConfiguration.class.getName()
              + ","
              + RabbitAutoConfiguration.class.getName());
      log.info("RabbitMQ auto-configuration excluded (broker disabled via environment).");
    }
    SpringApplication.run(SmartWalletApplication.class, allArgs.toArray(String[]::new));
  }

  /**
   * Supports {@code RABBITMQ_ENABLED=false} (docs) and {@code SPRING_RABBITMQ_ENABLED=false} (Spring
   * convention / Render). YAML placeholders alone were not always enough for listeners to stay off.
   */
  private static void applyRabbitMqDisableFromEnvironment() {
    if (!isRabbitMqDisabledByEnvironment()) {
      return;
    }
    System.setProperty("spring.rabbitmq.enabled", "false");
  }

  private static boolean isRabbitMqDisabledByEnvironment() {
    return envMeansFalse(System.getenv("RABBITMQ_ENABLED"))
        || envMeansFalse(System.getenv("SPRING_RABBITMQ_ENABLED"));
  }

  private static boolean envMeansFalse(String value) {
    if (value == null) {
      return false;
    }
    String v = value.trim();
    return "false".equalsIgnoreCase(v) || "0".equals(v) || "no".equalsIgnoreCase(v);
  }

  private static void loadEnv() {
    Path envPath = findEnvFile();
    if (envPath != null) {
      try {
        for (String line : Files.readAllLines(envPath)) {
          line = line.trim();
          if (line.isEmpty() || line.startsWith("#")) continue;
          var m = ENV_LINE.matcher(line);
          if (m.matches()) {
            String key = m.group(1);
            String value = m.group(2).replaceAll("^[\"']|[\"']$", "").trim();
            System.setProperty(key, value);
          }
        }
        log.info("Loaded .env from {}", envPath.toAbsolutePath());
      } catch (IOException e) {
        log.warn("Could not read .env: {}", e.getMessage());
      }
    }
  }

  private static Path findEnvFile() {
    Path current = Paths.get(System.getProperty("user.dir", ".")).toAbsolutePath();
    for (int i = 0; i < 4; i++) {
      Path env = current.resolve(".env");
      if (Files.exists(env)) {
        return env;
      }
      Path parent = current.getParent();
      if (parent == null) break;
      current = parent;
    }
    return null;
  }
}
