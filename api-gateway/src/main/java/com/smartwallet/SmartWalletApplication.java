package com.smartwallet;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class SmartWalletApplication {
  private static final Logger log = LoggerFactory.getLogger(SmartWalletApplication.class);
  private static final Pattern ENV_LINE = Pattern.compile("^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)$");

  public static void main(String[] args) {
    loadEnv();
    SpringApplication.run(SmartWalletApplication.class, args);
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
