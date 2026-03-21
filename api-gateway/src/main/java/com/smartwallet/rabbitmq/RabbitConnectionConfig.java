package com.smartwallet.rabbitmq;

import java.net.URI;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * When RABBITMQ_URI is set (e.g. CloudAMQP), use it for connection.
 * Otherwise Spring Boot auto-config uses host/port/username/password.
 */
@Configuration
@ConditionalOnProperty(name = "RABBITMQ_URI")
public class RabbitConnectionConfig {

  @Value("${RABBITMQ_URI}")
  private String uri;

  @Bean
  @Primary
  public ConnectionFactory connectionFactory() {
    var factory = new CachingConnectionFactory();
    try {
      URI u = URI.create(uri);
      factory.setUri(uri);
    } catch (Exception e) {
      throw new IllegalStateException("Invalid RABBITMQ_URI: " + e.getMessage());
    }
    return factory;
  }
}
