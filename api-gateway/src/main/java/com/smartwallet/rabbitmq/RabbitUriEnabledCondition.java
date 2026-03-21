package com.smartwallet.rabbitmq;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

/**
 * Matches when {@code RABBITMQ_URI} is set and {@code spring.rabbitmq.enabled} is true
 * (default true when unset).
 */
public class RabbitUriEnabledCondition implements Condition {

  @Override
  public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
    var env = context.getEnvironment();
    String uri = env.getProperty("RABBITMQ_URI");
    if (uri == null || uri.isBlank()) {
      return false;
    }
    return env.getProperty("spring.rabbitmq.enabled", Boolean.class, true);
  }
}
