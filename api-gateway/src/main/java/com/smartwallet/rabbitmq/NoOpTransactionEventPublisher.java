package com.smartwallet.rabbitmq;

import com.smartwallet.transactions.event.TransactionCreatedEvent;
import com.smartwallet.transactions.event.TransactionEventPublisher;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Used when {@code spring.rabbitmq.enabled=false} (e.g. Render without RabbitMQ) so
 * {@link com.smartwallet.transactions.event.TransactionEventPublisher} is still wired.
 */
@Component
@Profile("!integration")
@ConditionalOnProperty(prefix = "spring.rabbitmq", name = "enabled", havingValue = "false")
public class NoOpTransactionEventPublisher implements TransactionEventPublisher {

  @Override
  public void publishTransactionCreated(TransactionCreatedEvent event) {
    // no-op
  }
}
